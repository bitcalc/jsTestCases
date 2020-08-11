/*
 * Copyright (c) 2014-2020 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

import { ProductDetailsComponent } from '../product-details/product-details.component'
import { ActivatedRoute, Router } from '@angular/router'
import { ProductService } from '../Services/product.service'
import { BasketService } from '../Services/basket.service'
import { AfterViewInit, Component, NgZone, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core'
import { MatPaginator } from '@angular/material/paginator'
import { forkJoin, Subscription } from 'rxjs'
import { MatTableDataSource } from '@angular/material/table'
import { MatDialog } from '@angular/material/dialog'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { TranslateService } from '@ngx-translate/core'
import { SocketIoService } from '../Services/socket-io.service'
import { SnackBarHelperService } from '../Services/snack-bar-helper.service'

import { dom, library } from '@fortawesome/fontawesome-svg-core'
import { faCartPlus, faEye } from '@fortawesome/free-solid-svg-icons'
import { Product } from '../Models/product.model'
import { QuantityService } from '../Services/quantity.service'
import { DeluxeGuard } from '../app.guard'

library.add(faEye, faCartPlus)
dom.watch()

interface TableEntry {
  name: string
  price: number
  deluxePrice: number
  id: number
  image: string
  description: string
  quantity?: number
}

@Component({
  selector: 'app-search-result',
  templateUrl: './search-result.component.html',
  styleUrls: ['./search-result.component.scss']
})
export class SearchResultComponent implements OnDestroy, AfterViewInit {

  public displayedColumns = ['Image', 'Product', 'Description', 'Price', 'Select']
  public tableData!: any[]
  public pageSizeOptions: number[] = []
  public dataSource!: MatTableDataSource<TableEntry>
  public gridDataSource!: any
  public searchValue?: SafeHtml
  public resultsLength = 0
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator | null = null
  private productSubscription?: Subscription
  private routerSubscription?: Subscription
  public breakpoint: number = 6
  public emptyState = false

  constructor (private deluxeGuard: DeluxeGuard, private dialog: MatDialog, private productService: ProductService,
   private quantityService: QuantityService, private basketService: BasketService, private translateService: TranslateService,
   private router: Router, private route: ActivatedRoute, private sanitizer: DomSanitizer, private ngZone: NgZone, private io: SocketIoService,
   private snackBarHelperService: SnackBarHelperService, private cdRef: ChangeDetectorRef) { }

  ngAfterViewInit () {
    const products = this.productService.search('')
    const quantities = this.quantityService.getAll()
    forkJoin([quantities, products]).subscribe(([quantities, products]) => {
      let dataTable: TableEntry[] = []
      this.tableData = products
      this.trustProductDescription(products)
      for (const product of products) {
        dataTable.push({
          name: product.name,
          price: product.price,
          deluxePrice: product.deluxePrice,
          id: product.id,
          image: product.image,
          description: product.description
        })
      }
      for (const quantity of quantities) {
        const entry = dataTable.find((dataTableEntry) => {
          return dataTableEntry.id === quantity.ProductId
        })
        if (entry === undefined) {
          continue
        }
        entry.quantity = quantity.quantity
      }
      this.dataSource = new MatTableDataSource<TableEntry>(dataTable)
      for (let i = 1; i <= Math.ceil(this.dataSource.data.length / 12); i++) {
        this.pageSizeOptions.push(i * 12)
      }
      this.paginator.pageSizeOptions = this.pageSizeOptions
      this.dataSource.paginator = this.paginator
      this.gridDataSource = this.dataSource.connect()
      this.resultsLength = this.dataSource.data.length
      this.filterTable()
      this.routerSubscription = this.router.events.subscribe(() => {
        this.filterTable()
      })
      let challenge: string = this.route.snapshot.queryParams.challenge
      if (challenge && this.route.snapshot.url.join('').match(/hacking-instructor/)) {
        this.startHackingInstructor(decodeURIComponent(challenge))
      }
      if (window.innerWidth < 2600) {
        this.breakpoint = 4
        if (window.innerWidth < 1740) {
          this.breakpoint = 3
          if (window.innerWidth < 1280) {
            this.breakpoint = 2
            if (window.innerWidth < 850) {
              this.breakpoint = 1
            }
          }
        }
      } else {
        this.breakpoint = 6
      }
      this.cdRef.detectChanges()
    }, (err) => console.log(err))
  }

  ngOnDestroy () {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe()
    }
    if (this.productSubscription) {
      this.productSubscription.unsubscribe()
    }
    if (this.dataSource) {
      this.dataSource.disconnect()
    }
  }

  filterTable () {
    let queryParam: string = this.route.snapshot.queryParams.q
    if (queryParam) {
      queryParam = queryParam.trim()
      this.ngZone.runOutsideAngular(() => {
        this.io.socket().emit('verifyLocalXssChallenge', queryParam)
      })
      this.dataSource.filter = queryParam.toLowerCase()
      this.searchValue = this.sanitizer.bypassSecurityTrustHtml(queryParam)
      this.gridDataSource.subscribe((result: any) => {
        if (result.length === 0) {
          this.emptyState = true
        } else {
          this.emptyState = false
        }
      })
    } else {
      this.dataSource.filter = ''
      this.searchValue = undefined
      this.emptyState = false
    }
  }

  startHackingInstructor (challengeName: String) {
    console.log(`Starting instructions for challenge "${challengeName}"`)
    import(/* webpackChunkName: "tutorial" */ '../../hacking-instructor').then(module => {
      module.startHackingInstructorFor(challengeName)
    })
  }

  showDetail (element: Product) {
    this.dialog.open(ProductDetailsComponent, {
      width: '500px',
      height: 'max-content',
      data: {
        productData: element
      }
    })
  }

  addToBasket (id?: number) {
    this.basketService.find(Number(sessionStorage.getItem('bid'))).subscribe((basket) => {
      let productsInBasket: any = basket.Products
      let found = false
      for (let i = 0; i < productsInBasket.length; i++) {
        if (productsInBasket[i].id === id) {
          found = true
          this.basketService.get(productsInBasket[i].BasketItem.id).subscribe((existingBasketItem) => {
            let newQuantity = existingBasketItem.quantity + 1
            this.basketService.put(existingBasketItem.id, { quantity: newQuantity }).subscribe((updatedBasketItem) => {
              this.productService.get(updatedBasketItem.ProductId).subscribe((product) => {
                this.translateService.get('BASKET_ADD_SAME_PRODUCT', { product: product.name }).subscribe((basketAddSameProduct) => {
                  this.snackBarHelperService.open(basketAddSameProduct,'confirmBar')
                  this.basketService.updateNumberOfCardItems()
                }, (translationId) => {
                  this.snackBarHelperService.open(translationId,'confirmBar')
                  this.basketService.updateNumberOfCardItems()
                })
              }, (err) => console.log(err))
            },(err) => {
              this.snackBarHelperService.open(err.error?.error,'errorBar')
              console.log(err)
            })
          }, (err) => console.log(err))
          break
        }
      }
      if (!found) {
        this.basketService.save({ ProductId: id, BasketId: sessionStorage.getItem('bid'), quantity: 1 }).subscribe((newBasketItem) => {
          this.productService.get(newBasketItem.ProductId).subscribe((product) => {
            this.translateService.get('BASKET_ADD_PRODUCT', { product: product.name }).subscribe((basketAddProduct) => {
              this.snackBarHelperService.open(basketAddProduct,'confirmBar')
              this.basketService.updateNumberOfCardItems()
            }, (translationId) => {
              this.snackBarHelperService.open(translationId,'confirmBar')
              this.basketService.updateNumberOfCardItems()
            })
          }, (err) => console.log(err))
        }, (err) => {
          this.snackBarHelperService.open(err.error?.error,'errorBar')
          console.log(err)
        })
      }
    }, (err) => console.log(err))
  }

  trustProductDescription (tableData: any[]) {
    for (let i = 0; i < tableData.length; i++) {
      tableData[i].description = this.sanitizer.bypassSecurityTrustHtml(tableData[i].description)
    }
  }

  isLoggedIn () {
    return localStorage.getItem('token')
  }

  onResize (event: any) {
    if (event.target.innerWidth < 2600) {
      this.breakpoint = 4
      if (event.target.innerWidth < 1740) {
        this.breakpoint = 3
        if (event.target.innerWidth < 1280) {
          this.breakpoint = 2
          if (event.target.innerWidth < 850) {
            this.breakpoint = 1
          }
        }
      }
    } else {
      this.breakpoint = 6
    }
  }

  isDeluxe () {
    return this.deluxeGuard.isDeluxe()
  }
}
