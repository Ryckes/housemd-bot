
let request = require('request');
let jsdom = require('jsdom');
let TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token)
    throw new Error('Unset token. Use TELEGRAM_BOT_TOKEN.');
let bot = new TelegramBot(token, {polling: true});

let resultId = 0;

function prettify(quoteHTML) {
    return quoteHTML.split('<br>').join("\n").replace(/  +/g, ' ');
}

function startBot(quotes) {
    const numQuotes = quotes.length;

    function getRandomQuote() {
        return quotes[(Math.random() * numQuotes) | 0];
    }

    function getRandomSubsetOfQuotes() {
        // Not a subset, they may be repeated
        let quotes = [];
        for (let i = 0; i < 5; i++)
            quotes.push(prettify(getRandomQuote()));
        return quotes;
    }

    bot.on('inline_query', function(msg) {
        bot.answerInlineQuery(msg.id, getRandomSubsetOfQuotes().map(function(e) {
            return {
                type: 'article',
                id: '' + (resultId++),
                title: e.substr(0, 70),
                input_message_content: {
                    message_text: e
                }
            };
        }));
    });

    console.log();
    console.log('Listening...');
}

function removeNodes(root, tag) {
    for (let node of root.querySelectorAll(tag)) {
        node.remove();
    }
}

function unwrap(node, document) {
    let highlightedText = node.innerHTML;
    let parent = node.parentNode;
    let newNode = document.createTextNode(highlightedText);
    parent.insertBefore(newNode, node);
    parent.removeChild(node);
}

function emptyNodes(root, tag, window) {
    let nodes = root.querySelectorAll(tag);
    for (let node of nodes) {
        unwrap(node, window.document);
    }
}

function processBody(body) {
    let quotes;

    return new Promise(function(resolve, reject) {
        let dom = jsdom.env(body, function(err, window) {
            let quotesNode = window.document.querySelector('#tn15content');
            removeNodes(quotesNode, 'h5, hr');
            emptyNodes(quotesNode, 'a', window);
            emptyNodes(quotesNode, 'i', window);
            quotes = quotesNode.innerHTML.split('<br><br>');
            resolve(quotes);
        });
    });
}

request({
    uri: 'http://www.imdb.com/character/ch0015927/quotes',
    followRedirect: true
}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        processBody(body)
            .then(startBot);
    }
});
