// @ts-check
import { importAndCheckClasses } from '~/src/server/plugins/engine/services/autoComponentsFormUtil.js'

describe('importAndCheckClasses', () => {
  it('should run without throwing', async () => {
    await expect(importAndCheckClasses()).resolves.not.toThrow()
  })
})
