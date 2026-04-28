import {
  createFormI18nInstance,
  t
} from '~/src/server/plugins/engine/i18n/index.js'

describe('i18n t()', () => {
  it('returns the English string for a known key', () => {
    expect(t('errors.title', 'en-GB')).toBe('There is a problem')
  })

  it('falls back to en-GB for an unknown language', () => {
    expect(t('errors.title', 'fr')).toBe('There is a problem')
  })

  it('returns the Welsh string for cy locale', () => {
    expect(t('errors.title', 'cy')).toBe('Mae problem')
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

describe('createFormI18nInstance', () => {
  const formNamespace = {
    pages: { 'page-id': { title: 'Your personal details' } },
    components: {
      'comp-id': { title: 'First name', hint: 'As shown on licence' }
    },
    sections: {},
    listItems: {}
  }

  it('resolves plugin strings for en-GB', () => {
    const instance = createFormI18nInstance(formNamespace)
    const t = instance.getFixedT('en-GB', 'plugin')
    expect(t('common.continue')).toBe('Continue')
  })

  it('resolves form content from the form namespace for en-GB', () => {
    const instance = createFormI18nInstance(formNamespace)
    const t = instance.getFixedT('en-GB', 'form')
    expect(t('pages.page-id.title')).toBe('Your personal details')
  })

  it('falls back to en-GB form strings for an unknown language', () => {
    const instance = createFormI18nInstance(formNamespace)
    const t = instance.getFixedT('cy', 'form')
    expect(t('pages.page-id.title')).toBe('Your personal details')
  })

  it('resolves a Welsh override when registered', () => {
    const instance = createFormI18nInstance(formNamespace)
    instance.addResourceBundle(
      'cy',
      'form',
      { pages: { 'page-id': { title: 'Eich manylion personol' } } },
      true,
      true
    )
    const t = instance.getFixedT('cy', 'form')
    expect(t('pages.page-id.title')).toBe('Eich manylion personol')
  })
})
