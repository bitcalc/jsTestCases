/*
 * Copyright (c) 2014-2020 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

import { environment } from '../../environments/environment'
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { catchError, map } from 'rxjs/operators'

@Injectable({
  providedIn: 'root'
})
export class WalletService {

  private hostServer = environment.hostServer
  private host = this.hostServer + '/rest/wallet/balance'

  constructor (private http: HttpClient) { }

  get () {
    return this.http.get(this.host).pipe(map((response: any) => response.data), catchError((err) => { throw err }))
  }

  put (params) {
    return this.http.put(this.host, params).pipe(map((response: any) => response.data), catchError((err) => { throw err }))
  }
}
