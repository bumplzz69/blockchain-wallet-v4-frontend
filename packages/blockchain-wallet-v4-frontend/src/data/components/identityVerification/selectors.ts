import { path } from 'ramda'
import { RootState } from '../../rootReducer'

export const getVerificationStep = (state: RootState) =>
  state.components.identityVerification.verificationStep

// @Leora
// export const getSmsStep = path([
//   'components',
//   'identityVerification',
//   'smsStep'
// ])
export const getSmsStep = (state: RootState) =>
  state.components.identityVerification.smsStep

export const getEmailStep = path([
  'components',
  'identityVerification',
  'emailStep'
])

export const getSupportedCountries = path([
  'components',
  'identityVerification',
  'supportedCountries'
])

export const getSupportedDocuments = path([
  'components',
  'identityVerification',
  'supportedDocuments'
])

export const getStates = path(['components', 'identityVerification', 'states'])

export const getKycFlowConfig = path([
  'components',
  'identityVerification',
  'flowConfig'
])

export const getPreIdvData = path([
  'components',
  'identityVerification',
  'preIdvData'
])

export const getSteps = path(['components', 'identityVerification', 'steps'])