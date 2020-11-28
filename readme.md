# yahtzee-textract

[Yahtzee](https://en.wikipedia.org/wiki/Yahtzee) is a fun dice game. Dice rolls are tracked on a paper scorecard.

This repo uses [Amazon Textract](https://aws.amazon.com/textract/) to read a photo of the scorecard and add up the numbers for you. It makes mistakes, but the React app lets you make corrections.

### dev

Run the server. You'll want to restart it after making changes or use something like `nodemon`.

```
$ node server.js
```

The client will build when you make changes and auto-refresh your browser.

```
$ npm start
$ open http://localhost:1234/
```

### deploy

I have this running on Heroku. You could clone this and push it there.

```
$ git clone git@github.com:brandly/yahtzee-textract.git
$ cd yahtzee-textract
$ heroku create
$ git push heroku master
```

To connect with your AWS account, set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`:

```
$ heroku config:set AWS_ACCESS_KEY_ID=foo AWS_SECRET_ACCESS_KEY=bar
```

But it should run other places...

- build the client production build: `npm run heroku-postbuild`
- set AWS keys
- start the server: `node server.js`
