import { put, select, call } from 'redux-saga/effects'
import { isEmpty } from 'ramda'

import { callLatest } from 'utils/effects'
import { actions, selectors } from 'data'
import profileSagas, {
  userIdError,
  lifetimeTokenError
} from 'data/modules/profile/sagas'
import { Remote } from 'blockchain-wallet-v4/src'

import * as A from './actions'
import { SMS_STEPS, SMS_NUMBER_FORM, PERSONAL_FORM } from './model'

export const logLocation = 'components/identityVerification/sagas'

export const failedToFetchAddressesError = 'Invalid zipcode'
export const noCountryCodeError = 'Country code is not provided'
export const noPostCodeError = 'Post code is not provided'

export default ({ api, coreSagas }) => {
  const { createUser, generateAuthCredentials } = profileSagas({
    api,
    coreSagas
  })

  const updateSmsStep = ({ smsNumber, smsVerified }) => {
    if (smsNumber && !smsVerified) return SMS_STEPS.verify
    return SMS_STEPS.edit
  }

  const updateSmsNumber = function*() {
    const { smsNumber } = yield select(
      selectors.form.getFormValues(SMS_NUMBER_FORM)
    )
    yield put(actions.form.startSubmit(SMS_NUMBER_FORM))
    yield put(actions.modules.settings.updateMobile(smsNumber))
    yield put(A.setSmsStep(SMS_STEPS.verify))
  }

  const verifySmsNumber = function*() {
    yield put(actions.form.startSubmit(SMS_NUMBER_FORM))
    const { code } = yield select(selectors.form.getFormValues(SMS_NUMBER_FORM))
    yield put(actions.modules.settings.verifyMobile(code))
  }

  const resendSmsCode = function*() {
    const smsNumber = (yield select(
      selectors.core.settings.getSmsNumber
    )).getOrElse('')
    yield put(actions.modules.settings.updateMobile(smsNumber))
  }

  const savePersonalData = function*() {
    try {
      const data = yield select(selectors.form.getFormValues(PERSONAL_FORM))
      yield put(actions.form.startSubmit(PERSONAL_FORM))
      yield call(createUser, { payload: { data } })
      yield put(actions.form.stopSubmit(PERSONAL_FORM))
    } catch (e) {
      yield put(actions.form.stopSubmit(PERSONAL_FORM, e))
      yield put(
        actions.logs.logErrorMessage(
          logLocation,
          'savePersonalData',
          `Error saving personal data: ${e}`
        )
      )
    }
  }

  const fetchSupportedCountries = function*() {
    try {
      yield put(A.setSupportedCountries(Remote.Loading))
      const countries = yield call(api.getSupportedCountries)
      yield put(A.setSupportedCountries(Remote.Success(countries)))
    } catch (e) {
      yield put(A.setSupportedCountries(Remote.Failure(e)))
      actions.logs.logErrorMessage(
        logLocation,
        'fetchSupportedCountries',
        `Error fetching supported countries: ${e}`
      )
    }
  }

  const fetchPossibleAddresses = function*({
    payload: { postCode, countryCode }
  }) {
    try {
      yield put(A.setAddressRefetchVisible(false))
      yield put(actions.form.startSubmit(PERSONAL_FORM))
      yield put(A.setPossibleAddresses([]))
      yield call(generateAuthCredentials)
      const addresses = yield callLatest(api.fetchKycAddresses, {
        postCode,
        countryCode
      })
      if (isEmpty(addresses)) throw new Error(failedToFetchAddressesError)
      yield put(A.setPossibleAddresses(addresses))
      yield put(actions.form.stopSubmit(PERSONAL_FORM))
    } catch (e) {
      if (e.message === userIdError || e.message === lifetimeTokenError) {
        yield put(actions.form.stopSubmit(PERSONAL_FORM))
        yield put(A.setAddressRefetchVisible(true))
      }

      if (e.description === noCountryCodeError) {
        yield put(
          actions.form.stopSubmit(PERSONAL_FORM, {
            country: 'Country code is required'
          })
        )
        return yield put(actions.form.touch(PERSONAL_FORM, 'country'))
      }
      if (e.description === noPostCodeError) {
        return yield put(
          actions.form.stopSubmit(PERSONAL_FORM, {
            postCode: 'Required'
          })
        )
      }
      if (e.message === failedToFetchAddressesError) {
        return yield put(
          actions.form.stopSubmit(PERSONAL_FORM, {
            postCode: failedToFetchAddressesError
          })
        )
      }
      yield put(actions.form.stopSubmit(PERSONAL_FORM))
      actions.logs.logErrorMessage(
        logLocation,
        'fetchPossibleAddresses',
        `Error fetching addresses: ${e}`
      )
    }
  }

  const selectAddress = function*({
    payload: {
      address: { line1, line2, city, state }
    }
  }) {
    yield put(actions.form.change(PERSONAL_FORM, 'line1', line1))
    yield put(actions.form.change(PERSONAL_FORM, 'line2', line2))
    yield put(actions.form.change(PERSONAL_FORM, 'city', city))
    yield put(actions.form.change(PERSONAL_FORM, 'state', state))
  }

  return {
    fetchSupportedCountries,
    fetchPossibleAddresses,
    resendSmsCode,
    savePersonalData,
    selectAddress,
    updateSmsStep,
    updateSmsNumber,
    verifySmsNumber
  }
}
