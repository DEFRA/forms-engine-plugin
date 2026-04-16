import { t } from '~/src/server/plugins/engine/i18n/index.js'

describe('i18n t()', () => {
  it('returns the English string for a known key', () => {
    expect(t('errors.title', 'en-GB')).toBe('There is a problem')
  })

  it('falls back to en-GB for an unknown language', () => {
    expect(t('errors.title', 'cy')).toBe('There is a problem')
  })

  it('returns the key string itself when the key does not exist', () => {
    expect(t('does.not.exist', 'en-GB')).toBe('does.not.exist')
  })

  it('interpolates [[...]] placeholders', () => {
    expect(t('pages.repeater.pageTitle', 'en-GB', { count: 3 })).toBe(
      'You have added 3 answers'
    )
  })

  it('selects _one plural variant when count is 1', () => {
    expect(t('pages.repeater.pageTitle', 'en-GB', { count: 1 })).toBe(
      'You have added 1 answer'
    )
  })
})
