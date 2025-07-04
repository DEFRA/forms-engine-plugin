import { resolve } from 'node:path'

import convict, { type SchemaObj } from 'convict'
import { type LevelWithSilent } from 'pino'

import 'dotenv/config'

const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV !== 'production'
const isTest = process.env.NODE_ENV === 'test'

const oneMinute = 1000 * 60
const oneHour = oneMinute * 60

export const config = convict({
  appDir: {
    format: String,
    default: resolve(import.meta.dirname, '../server')
  },
  publicDir: {
    format: String,
    default: isTest
      ? resolve(import.meta.dirname, '../../test/fixtures')
      : resolve(import.meta.dirname, '../../.public')
  },

  /**
   * Server
   */
  port: {
    format: 'port',
    default: 3009,
    env: 'PORT'
  },
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is currently in, with the addition of "local"',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  enforceCsrf: {
    format: Boolean,
    default: isProduction,
    env: 'ENFORCE_CSRF'
  },

  /**
   * Helper flags
   */
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDev
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },

  /**
   * Service
   */
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'Digital Express Toolkit'
  },
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: '',
    env: 'SERVICE_VERSION'
  } as SchemaObj<string>,
  feedbackLink: {
    doc: 'Used in your phase banner. Can be a URL or more commonly mailto mailto:feedback@department.gov.uk',
    format: String,
    default: '',
    env: 'FEEDBACK_LINK'
  } as SchemaObj<string>,
  phaseTag: {
    format: String,
    default: 'beta', // Accepts "alpha" |"beta" | ""
    env: 'PHASE_TAG'
  },

  /**
   * Session storage
   * Redis integration is optional, but recommended for production environments.
   */
  sessionTimeout: {
    format: Number,
    default: oneHour * 24, // 1 day
    env: 'SESSION_TIMEOUT'
  },
  confirmationSessionTimeout: {
    format: Number,
    default: oneMinute * 20,
    env: 'CONFIRMATION_SESSION_TIMEOUT'
  },
  sessionCookiePassword: {
    format: String,
    default: '',
    sensitive: true,
    env: 'SESSION_COOKIE_PASSWORD'
  } as SchemaObj<string>,
  redis: {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '',
      env: 'REDIS_HOST'
    } as SchemaObj<string>,
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    } as SchemaObj<string>,
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    } as SchemaObj<string>,
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: '',
      env: 'REDIS_KEY_PREFIX'
    } as SchemaObj<string>
  },
  tracing: {
    header: {
      doc: 'Tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    } as SchemaObj<string>
  },

  /**
   * Email outputs
   * Email outputs will use notify to send an email to a single inbox.
   */
  notifyTemplateId: {
    format: String,
    default: '',
    env: 'NOTIFY_TEMPLATE_ID'
  } as SchemaObj<string>,
  notifyAPIKey: {
    format: String,
    default: '',
    env: 'NOTIFY_API_KEY'
  } as SchemaObj<string>,

  /**
   * API integrations
   */
  designerUrl: {
    format: String,
    default: 'http://localhost:3000',
    env: 'DESIGNER_URL'
  } as SchemaObj<string>,

  submissionUrl: {
    format: String,
    default: 'http://localhost:3002',
    env: 'SUBMISSION_URL'
  } as SchemaObj<string>,

  uploaderUrl: {
    format: String,
    default: 'http://localhost:7337',
    env: 'UPLOADER_URL'
  } as SchemaObj<string>,

  uploaderBucketName: {
    format: String,
    default: 'files',
    env: 'UPLOADER_BUCKET_NAME'
  },

  /**
   * Logging
   */
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    } as SchemaObj<LevelWithSilent>,
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    } as SchemaObj<'ecs' | 'pino-pretty'>,
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },

  safelist: {
    format: Array,
    default: ['61bca17e-fe74-40e0-9c15-a901ad120eca.mock.pstmn.io'],
    env: 'SAFELIST'
  },

  stagingPrefix: {
    doc: 'Prefix for staging files in S3',
    format: String,
    default: 'staging',
    env: 'STAGING_PREFIX'
  },

  submissionEmailAddress: {
    doc: 'Email address to send the form to (local devtool only)',
    format: String,
    default: '',
    env: 'SUBMISSION_EMAIL_ADDRESS'
  } as SchemaObj<string>
})

config.validate({ allowed: 'strict' })
