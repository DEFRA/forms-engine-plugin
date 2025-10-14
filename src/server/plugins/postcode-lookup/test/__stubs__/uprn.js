export const result = {
  header: {
    uri: 'https://api.os.uk/search/places/v1/uprn?uprn=200003232010',
    query: 'uprn=200003232010',
    offset: 0,
    totalresults: 1,
    format: 'JSON',
    dataset: 'DPA',
    lr: 'EN,CY',
    maxresults: 100,
    epoch: '120',
    lastupdate: '2025-10-13',
    output_srs: 'EPSG:27700'
  },
  results: [
    {
      DPA: {
        UPRN: '200003232010',
        UDPRN: '6132431',
        ADDRESS: 'FOREST DENE, FOREST HILL, HARTFORD, NORTHWICH, CW8 2AT',
        BUILDING_NAME: 'FOREST DENE',
        THOROUGHFARE_NAME: 'FOREST HILL',
        DEPENDENT_LOCALITY: 'HARTFORD',
        POST_TOWN: 'NORTHWICH',
        POSTCODE: 'CW8 2AT',
        RPC: '1',
        X_COORDINATE: 361852.0,
        Y_COORDINATE: 371487.0,
        STATUS: 'APPROVED',
        LOGICAL_STATUS_CODE: '1',
        CLASSIFICATION_CODE: 'RD02',
        CLASSIFICATION_CODE_DESCRIPTION: 'Detached',
        LOCAL_CUSTODIAN_CODE: 665,
        LOCAL_CUSTODIAN_CODE_DESCRIPTION: 'CHESHIRE WEST AND CHESTER',
        COUNTRY_CODE: 'E',
        COUNTRY_CODE_DESCRIPTION: 'This record is within England',
        POSTAL_ADDRESS_CODE: 'D',
        POSTAL_ADDRESS_CODE_DESCRIPTION: 'A record which is linked to PAF',
        BLPU_STATE_CODE: '2',
        BLPU_STATE_CODE_DESCRIPTION: 'In use',
        TOPOGRAPHY_LAYER_TOID: 'osgb1000035905836',
        WARD_CODE: 'E05012219',
        PARISH_CODE: 'E04012543',
        PARENT_UPRN: '10011719253',
        LAST_UPDATE_DATE: '24/04/2019',
        ENTRY_DATE: '04/09/2002',
        BLPU_STATE_DATE: '15/11/2007',
        LANGUAGE: 'EN',
        MATCH: 1.0,
        MATCH_DESCRIPTION: 'EXACT',
        DELIVERY_POINT_SUFFIX: '1J'
      }
    }
  ]
}
