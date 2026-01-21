/**
 * Gov Uk Pay API result status
 * @typedef {object} PaymentStateResult
 * @property {string} status - status of payment
 * @property {boolean} finished - true if payment is finished
 */

/**
 * @typedef {object} PaymentLink
 * @property {string} href - url
 * @property {string} method - get/post
 */

/**
 * @typedef {object} PaymentLinks
 * @property {PaymentLink} self - current url
 * @property {PaymentLink} next_url - next url
 */

/**
 * @typedef {object} CreatePaymentMetadata
 * @property {string} formId - id of the form
 * @property {string} slug - slug of the form
 */

/**
 * Gov Uk Pay create payment request
 * @typedef {object} CreatePaymentRequest
 * @property {number} amount - payment amount
 * @property {string} reference - form reference number
 * @property {string} description - payment description
 * @property {string} return_url - unique payment id
 * @property {CreatePaymentMetadata} metadata - custom metadata
 * @property {boolean} delayed_capture - denotes pre-auth only
 */

/**
 * Gov Uk Pay create payment response
 * @typedef {object} CreatePaymentResponse
 * @property {Date} created_date - date of creation
 * @property {PaymentStateResult} state - result state
 * @property {PaymentLinks} _links - payment links
 * @property {string} reference - form reference number
 * @property {number} amount - payment amount
 * @property {string} payment_id - unique payment id
 */
