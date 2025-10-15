export const result = {
  header: {
    uri: 'https://api.os.uk/search/places/v1/uprn?uprn=100023071949',
    query: 'uprn=100023071949',
    offset: 0,
    totalresults: 1,
    format: 'JSON',
    dataset: 'DPA',
    lr: 'EN,CY',
    maxresults: 100,
    epoch: '121',
    lastupdate: '2025-10-14',
    output_srs: 'EPSG:27700'
  },
  results: [
    {
      DPA: {
        UPRN: '100023071949',
        UDPRN: '17646242',
        ADDRESS: 'SHERLOCK HOLMES MUSEUM, 221B, BAKER STREET, LONDON, NW1 6XE',
        ORGANISATION_NAME: 'SHERLOCK HOLMES MUSEUM',
        BUILDING_NAME: '221B',
        THOROUGHFARE_NAME: 'BAKER STREET',
        POST_TOWN: 'LONDON',
        POSTCODE: 'NW1 6XE',
        RPC: '2',
        X_COORDINATE: 527847.0,
        Y_COORDINATE: 182144.0,
        STATUS: 'APPROVED',
        LOGICAL_STATUS_CODE: '1',
        CLASSIFICATION_CODE: 'CR08',
        CLASSIFICATION_CODE_DESCRIPTION: 'Shop / Showroom',
        LOCAL_CUSTODIAN_CODE: 5990,
        LOCAL_CUSTODIAN_CODE_DESCRIPTION: 'CITY OF WESTMINSTER',
        COUNTRY_CODE: 'E',
        COUNTRY_CODE_DESCRIPTION: 'This record is within England',
        POSTAL_ADDRESS_CODE: 'D',
        POSTAL_ADDRESS_CODE_DESCRIPTION: 'A record which is linked to PAF',
        BLPU_STATE_CODE: '2',
        BLPU_STATE_CODE_DESCRIPTION: 'In use',
        TOPOGRAPHY_LAYER_TOID: 'osgb1000005158436',
        WARD_CODE: 'E05013805',
        LAST_UPDATE_DATE: '23/09/2018',
        ENTRY_DATE: '19/03/2001',
        BLPU_STATE_DATE: '19/03/2001',
        LANGUAGE: 'EN',
        MATCH: 1.0,
        MATCH_DESCRIPTION: 'EXACT',
        DELIVERY_POINT_SUFFIX: '1F'
      }
    }
  ]
}
