import { Component, Input, OnInit } from '@angular/core';
import { Content, Header, Codeblock, Textarea, InputTable } from '../../interfaces';

@Component({
  selector: 'article-content',
  templateUrl: './article-content.component.html',
  styleUrls: ['./article-content.component.css']
})
export class ArticleContentComponent implements OnInit
{
	constructor() { }

	@Input() articleContent!: Content;

	public isCodeActive: boolean = false;
	public shouldBeExpandable: boolean = false;

	ngOnInit(): void
	{
		if (this.articleContent.type == 1)
		{
			this.shouldBeExpandable = this.get_codeblock.text.length > 1024 ? true : false;
		}
	}

	public get get_header(): Header
	{
		return <Header>this.articleContent;
	}

	public get get_codeblock(): Codeblock
	{
		return <Codeblock>this.articleContent;
	}

	public get get_textarea(): Textarea
	{
		return <Textarea>this.articleContent;
	}

	public get get_inputTable(): InputTable
	{
		return <InputTable>this.articleContent;

	}

	public get_id(value: string): string
	{
		return value.toLowerCase().replace(' ', '-');
	}

	public toggle_codeblock(): void
	{
		this.isCodeActive = !this.isCodeActive;
	}

}
