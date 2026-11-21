import { getErrorMessage } from '@defra/forms-model'

import { config } from '~/src/config/index.js'
import { escapeMarkdown } from '~/src/server/plugins/engine/components/helpers/index.js'
import { checkFormStatus } from '~/src/server/plugins/engine/helpers.js'
import { getFormatter } from '~/src/server/plugins/engine/outputFormatters/index.js'
import { sendNotification } from '~/src/server/utils/notify.js'

const templateId = config.get('notifyTemplateId')

/**
 * Optional GOV.UK Notify service for consumers who want email notifications
 * Can be disabled by not providing notifyTemplateId in config
 * Can be overridden by providing a custom outputService in the services config
 * @param {FormContext} context
 * @param {FormRequestPayload} request
 * @param {FormModel} model
 * @param {string} emailAddress
 * @param {DetailItem[]} items
 * @param {SubmitResponsePayload} submitResponse
 * @param {FormMetadata} [formMetadata]
 */
export async function submit(
  context,
  request,
  model,
  emailAddress,
  items,
  submitResponse,
  formMetadata
) {
  if (!templateId) {
    return Promise.resolve()
  }

  const logTags = ['submit', 'email']
  const formStatus = checkFormStatus(request.params)

  // Get submission email personalisation
  request.logger.info(logTags, 'Getting personalisation data')

  const formName = escapeMarkdown(model.name)
  const subject = formStatus.isPreview
    ? `TEST FORM SUBMISSION: ${formName}`
    : `Form submission: ${formName}`

  const outputAudience = model.def.output?.audience ?? 'human'
  const outputVersion = model.def.output?.version ?? '1'

  const outputFormatter = getFormatter(outputAudience, outputVersion)
  let body = outputFormatter(
    context,
    items,
    model,
    submitResponse,
    formStatus,
    formMetadata
  )

  // GOV.UK Notify transforms quotes into curly quotes, so we can't just send the raw payload
  // This is logic specific to Notify, so we include the logic here rather than in the formatter
  if (outputAudience === 'machine') {
    body = Buffer.from(body).toString('base64')
  }

  request.logger.info(logTags, 'Sending email')

  try {
    // Send submission email
    await sendNotification({
      templateId,
      emailAddress,
      personalisation: {
        subject,
        body
      }
    })

    request.logger.info(logTags, 'Email sent successfully')
  } catch (err) {
    request.logger.error(
      err,
      `[emailSendFailed] Error sending notification email - templateId: ${templateId} - recipient: ${emailAddress} - ${getErrorMessage(err)}`
    )

    throw err
  }
}

/**
 * @import { FormMetadata, SubmitResponsePayload } from '@defra/forms-model'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { DetailItem } from '~/src/server/plugins/engine/models/types.js'
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequestPayload } from '~/src/server/routes/types.js'
 */
