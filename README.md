---
title: Quote API
emoji: 💬
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
---

# API For Generating Telegram Quote

## Method

```http
POST /
```

## Parameters:

| Field           | Type   | Description                                                                      |
| :-------------- | :----- | :------------------------------------------------------------------------------- |
| type            | string | Output Image Type. Can be: quote, image, stories, null									  |
| backgroundColor | string | The background color of the quote. Can be Hex, name or random for a random color |
| backgroundImage | string | The background image of the quote. Can be a URL or base64 encoded image. 		  |
| messages        | array  | Array of messages                                                                |
| width           | number | Maximum width                                                                    |
| height          | number | Maximum height                                                                   |
| scale           | number | Scale                                                                            |

## Messages Data
| Field 										| Type 	| Required	| Description													|
| :-------------------------------- | :----- | :-------- | :----------------------------------------------- |
| entities									| array 	| false 		| by default the value must be an array, but you can fill it with the string _auto_ |
| entities[].type							| string	| false		| Can be bold, custom_emoji, code, url, hashtag, mention, italic, strikethrough, monospace, spoiler |
| entities[].offset						| number	| false		| offset text	|
| entities[].length						| number	| false		| length text	|
| chatId										| number	| false		| id chat telegram	|
| avatar										| string	| false		| load an avatar or profile |
| text										| string | true		| message |
| mediaType									| string	| false		| Can be sticker, image, gif	|
| from.id									| string | false		| sender telegram id
| from.first_name 						| string	| false		| first name telegram |
| from.last_name							| string | false		| last name telegram	|
| from.username							| string | false		| username telegram	|
| from.language_code						| string	| false 		| language code telegram |
| from.title								| string	| false		| title on telegram like admin, satpam, dll. |
| from.type									| string	| false		| Type profile on telegram, default as _public_, can be _private_ |
| from.name 								| string | true		| name of the message sender	|
| from.photo.small_file_id 			| string | false		| profile picture file id telegram	|
| from.photo.small_file_unique_id 	| string	| false		| profile picture file unique id telegram |
| from.photo.big_file_id				| string | false		| profile picture file id telegram	|
| from.photo.big_file_unique_id		| string	| false		| profile picture file unique id telegram |
| from.photo.url 							| string | false		| profile picture message sender |
| replyMessage.name 						| string | false 		| quoted name |
| replyMessage.text		 				| string | false		| quoted message |
| replyMessage.entities 				| string | false 		| same as before |
| media.file_id							| string	| false		| file media id message telegram |
| media.file_size							| number	| false		| file size media message telegram	|
| media.height								| number | false		| media height message telegram |
| media.width								| number | false		| media width message telegram |
| media.url 								| string	| false		| media message |

<br>

## Example Simple request:

```json
{
	"type": "",
	"format": "png",
	"backgroundColor": "#1b1e23",
	"width": 512,
	"height": 720,
	"scale": 2, // type "stories" use scale 4
	"watermark": "hisoka.net", // only for type "stories"
	"messages": [
		{
			"entities": "auto",
			"avatar": true,
			"from": {
				"name": "Hisoka.net",
				"photo": {
					"url": "https://hisoka.net/img/hisoka.png"
				}
			},
			"text": "Hisoka is a WhatsApp Bot hosting service built to streamline automation management\n\n🔗 https://www.hisoka.net",
			"replyMessage": {
				"name": "Dika Ardnt.",
				"text": "What is Hisoka?",
				"entities": "auto"
			},
			"media": {
				"url": "https://quote.kua.lat/hisoka.jpg"
			}
		}
	]
}
```

Example response:

```json
{
	"image": "base64 image",
	"type": "quote",
	"width": 512,
	"height": 359
}
```

### Response
## [Stories](/Stories.png)
## [Image](/Image.png)
## [Quote](/#quote)
<img id="quote" loading="lazy" width="480" height="230" src="/Quotly.png" title="Quotly"></img>