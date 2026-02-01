/* eslint-env mocha */
const expect = require('expect').default
const assert = require('assert')
const testedVersions = require('..').testedVersions

describe('Block From Properties', () => {
  // PC (Java)
  it('spruce half slab: waterlogged, upper (pc_1.16.4)', () => {
    const registry = require('prismarine-registry')('1.16.4')
    const Block = require('prismarine-block')(registry)
    const spruceSlabId = registry.blocksByName.spruce_slab.id
    const properties = { type: 'top', waterlogged: true }
    const block = Block.fromProperties(spruceSlabId, properties, 0)

    expect(block.stateId).toBe(8310)
    expect(block.getProperties()).toMatchObject(properties)
  })
  it('Boolean properties are string (1.18.2, ...)', () => {
    const registry = require('prismarine-registry')('1.18.2')
    const Block = require('prismarine-block')(registry)
    const signId = registry.blocksByName.oak_sign.id
    const sourceProperties = { waterlogged: 'false', rotation: '8' }

    const block = Block.fromProperties(signId, sourceProperties, 0)
    expect(block.stateId).toBe(3455)
    expect(block.getProperties()).toMatchObject({ waterlogged: false, rotation: 8 })
  })

  // Bedrock
  it('spruce half slab: waterlogged, upper (bedrock_1.17.10)', () => {
    const registry = require('prismarine-registry')('bedrock_1.17.10')
    const Block = require('prismarine-block')(registry)
    const cauldronId = registry.blocksByName.cauldron.id
    const properties = { cauldron_liquid: 'water', fill_level: 5 }
    const block = Block.fromProperties(cauldronId, properties, 0)
    expect(block.getProperties()).toMatchObject(properties)
  })
})

describe('versions should return block state and properties', () => {
  for (const ver of testedVersions) {
    const e = ver.startsWith('bedrock') ? 'bedrock' : 'pc'
    it(ver, () => {
      const registry = require('prismarine-registry')(ver)
      const Block = require('prismarine-block')(registry)

      // Test that .stateId is set on all versions
      {
        const blockData = registry.blocksByName.redstone_lamp
        const block = Block.fromStateId(blockData.defaultState)
        assert(block.stateId >= blockData.minStateId && block.stateId <= blockData.maxStateId)
        expect(block.getProperties()).toMatchObject({})
      }

      // make sure that .fromProperties works
      {
        const blockData = registry.blocksByName.light_weighted_pressure_plate
        const properties = { pc: { power: '2' }, bedrock: { redstone_signal: 2 } }[e]
        const block = Block.fromProperties(blockData.name, properties, 0)
        assert(block.stateId >= blockData.minStateId && block.stateId <= blockData.maxStateId)
        const propertiesNormalized = block.getProperties()
        if (e === 'pc') {
          for (const key in propertiesNormalized) {
            propertiesNormalized[key] = propertiesNormalized[key].toString()
          }
        }
        expect(propertiesNormalized).toMatchObject(properties)
      }

      // Make sure type IDs work
      {
        const blockData = registry.blocksByName.dirt
        const block = new Block(blockData.id, 0, 2)
        assert(block.name === 'dirt')

        const block2 = new Block(blockData.id, 0, 99)
        assert(block2.name === 'dirt')

        const invalid = new Block(9999, 0, 0)
        assert(invalid.name === '')
      }
    })
  }
})

describe('Unknown Block Handling', () => {
  it('should throw error for unknown block by default (throw mode)', () => {
    const registry = require('prismarine-registry')('1.16.4')
    const Block = require('prismarine-block')(registry)

    expect(() => {
      Block.fromProperties('nonexistent_block_xyz', { some: 'property' }, 0)
    }).toThrow('No matching block id found')
  })

  it('should return fallback block when mode is set to fallback', () => {
    const registry = require('prismarine-registry')('1.16.4')
    const Block = require('prismarine-block')(registry)

    Block.setUnknownBlockHandling('fallback')

    const block = Block.fromProperties('nonexistent_block_xyz', { some: 'property' }, 0)

    expect(block.unknown).toBe(true)
    expect(block.originalName).toBe('nonexistent_block_xyz')
    expect(block.originalProperties).toMatchObject({ some: 'property' })
    expect(block.displayName).toBe('Unknown (nonexistent_block_xyz)')
    expect(block.name).toBe('stone') // default fallback

    // Reset to default mode for other tests
    Block.setUnknownBlockHandling('throw')
  })

  it('should use custom fallback block when configured', () => {
    const registry = require('prismarine-registry')('1.16.4')
    const Block = require('prismarine-block')(registry)

    Block.setUnknownBlockHandling('fallback')
    Block.setUnknownBlockFallback('dirt')

    const block = Block.fromProperties('another_unknown_block', {}, 0)

    expect(block.unknown).toBe(true)
    expect(block.name).toBe('dirt')
    expect(block.originalName).toBe('another_unknown_block')

    // Reset to defaults
    Block.setUnknownBlockHandling('throw')
    Block.setUnknownBlockFallback('stone')
  })

  it('should throw error if fallback block is not found', () => {
    const registry = require('prismarine-registry')('1.16.4')
    const Block = require('prismarine-block')(registry)

    Block.setUnknownBlockHandling('fallback')
    Block.setUnknownBlockFallback('nonexistent_fallback')

    expect(() => {
      Block.fromProperties('unknown_block', {}, 0)
    }).toThrow("Unknown block 'unknown_block' and fallback block 'nonexistent_fallback' not found")

    // Reset to defaults
    Block.setUnknownBlockHandling('throw')
    Block.setUnknownBlockFallback('stone')
  })

  it('should validate handling mode parameter', () => {
    const registry = require('prismarine-registry')('1.16.4')
    const Block = require('prismarine-block')(registry)

    expect(() => {
      Block.setUnknownBlockHandling('invalid_mode')
    }).toThrow("Unknown block handling mode must be either 'throw' or 'fallback'")
  })
})
