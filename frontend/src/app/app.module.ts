import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { LogginFormComponent } from './loggin-form/loggin-form.component';
import { EndScreenComponent } from './end-screen/end-screen.component';
import { NewCardComponent } from './new-card/new-card.component';
import {NgOptimizedImage} from "@angular/common";
import { WaitlistComponent } from './waitlist/waitlist.component';

@NgModule({
  declarations: [
    AppComponent,
    LogginFormComponent,
    EndScreenComponent,
    NewCardComponent,
    WaitlistComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    NgOptimizedImage
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
