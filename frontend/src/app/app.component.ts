import {Component} from '@angular/core';
import {CardColors, CardValues} from "../../../sources/cardEnum";
import {SettingsService} from "./settings.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  protected readonly CardColors = CardColors;
  protected readonly CardValues = CardValues;

  constructor(public service: SettingsService) {}

}
