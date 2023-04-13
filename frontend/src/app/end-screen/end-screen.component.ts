import { Component } from '@angular/core';
import {SettingsService} from "../settings.service";

@Component({
  selector: 'app-end-screen',
  templateUrl: './end-screen.component.html',
  styleUrls: ['./end-screen.component.css']
})
export class EndScreenComponent {

  constructor(public service: SettingsService) {}

}
