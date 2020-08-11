/*
 * Copyright (c) 2014-2020 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

const utils = require('../lib/utils')
const insecurity = require('../lib/insecurity')
const models = require('../models/index')

module.exports = function retrieveUserList () {
  return (req, res, next) => {
    models.User.findAll().then(users => {
      const usersWithLoginStatus = utils.queryResultToJson(users)
      usersWithLoginStatus.data.forEach(user => {
        user.token = insecurity.authenticatedUsers.tokenOf(user)
        user.password = user.password ? user.password.replace(/./g, '*') : null
      })
      res.json(usersWithLoginStatus)
    }).catch(error => {
      next(error)
    })
  }
}
