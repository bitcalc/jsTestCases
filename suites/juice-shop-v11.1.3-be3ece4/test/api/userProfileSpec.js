/*
 * Copyright (c) 2014-2020 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

const frisby = require('frisby')
const config = require('config')

const URL = 'http://localhost:3000'

const jsonHeader = { 'content-type': 'application/json' }
let authHeader

beforeAll(() => {
  return frisby.post(URL + '/rest/user/login', {
    headers: jsonHeader,
    body: {
      email: 'jim@juice-sh.op',
      password: 'ncc-1701'
    }
  })
    .expect('status', 200)
    .then(({ json }) => {
      authHeader = { Cookie: 'token=' + json.authentication.token }
    })
})

describe('/profile', () => {
  it('GET user profile is forbidden for unauthenticated user', () => {
    return frisby.get(URL + '/profile')
      .expect('status', 500)
      .expect('header', 'content-type', /text\/html/)
      .expect('bodyContains', `<h1>${config.get('application.name')} (Express`)
      .expect('bodyContains', 'Error: Blocked illegal activity')
  })

  it('GET user profile of authenticated user', () => {
    return frisby.get(URL + '/profile', {
      headers: authHeader
    })
      .expect('status', 200)
      .expect('header', 'content-type', /text\/html/)
      .expect('bodyContains', 'id="email" type="email" name="email" value="jim@juice-sh.op"')
  })
})
