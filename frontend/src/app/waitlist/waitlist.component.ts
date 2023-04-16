import {Component, Input} from '@angular/core';
import {SettingsService} from "../settings.service";

@Component({
  selector: 'app-waitlist',
  templateUrl: './waitlist.component.html',
  styleUrls: ['./waitlist.component.css']
})
export class WaitlistComponent {

  constructor(public service: SettingsService) {
  }

}
