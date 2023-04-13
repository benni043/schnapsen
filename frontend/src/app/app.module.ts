import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { CardComponent } from './card/card.component';
import { LogginFormComponent } from './loggin-form/loggin-form.component';
import { EndScreenComponent } from './end-screen/end-screen.component';

@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    LogginFormComponent,
    EndScreenComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
