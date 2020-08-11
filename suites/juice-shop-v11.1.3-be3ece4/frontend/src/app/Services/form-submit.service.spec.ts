/*
 * Copyright (c) 2014-2020 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

import { inject, TestBed } from '@angular/core/testing'

import { FormSubmitService } from './form-submit.service'

describe('FormSubmitService', () => {
  beforeEach(() => {

    TestBed.configureTestingModule({
      providers: [FormSubmitService]
    })
  })

  it('should be created', inject([FormSubmitService], (service: FormSubmitService) => {
    expect(service).toBeTruthy()
  }))
})
