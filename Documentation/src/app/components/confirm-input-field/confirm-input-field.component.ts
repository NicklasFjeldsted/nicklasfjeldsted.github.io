import {
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnInit,
	Output,
	ViewChild
} from '@angular/core';

@Component({
	selector: 'confirm-input-field',
	templateUrl: './confirm-input-field.component.html',
	styleUrls: ['./confirm-input-field.component.css']
})
export class ConfirmInputFieldComponent implements OnInit
{
	constructor() {}

	ngOnInit(): void { }

	@Input() isActive: boolean = false;

	@Output() confirm: EventEmitter<any> = new EventEmitter<any>();
	@Output() cancel: EventEmitter<any> = new EventEmitter<any>();

	@ViewChild('inputValue') inputValue!: ElementRef;

	public raiseConfirm(value: any): void
	{
		this.inputValue.nativeElement.value = null;
		this.confirm.emit(value);
	}

	public raiseCancel(value: any): void
	{
		this.inputValue.nativeElement.value = null;
		this.cancel.emit(value);
	}
}
