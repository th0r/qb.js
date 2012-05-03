var http = require('http'),
    fs = require('fs'),
    connect = require('connect'),
    util = require('util'),
    parseUrl = require('url').parse,
    parseQuery = require('querystring').parse;

var app = connect();

// Объявляем директории со статикой
'qb libs tests examples static'.split(' ').forEach(function(folder) {
    app.use('/' + folder, connect.static(folder));
});

app.use(connect.query())
    // Отдаем JSON-ответ из параметров GET или POST-запроса
    .use('/json', connect.bodyParser())
    .use('/json', function(req, res) {
        var json = (req.method === 'GET') ? req.query : req.body;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(json));
    })
    // По-умолчанию - запуск тестов
    .use(function(req, res) {
        util.pump(fs.createReadStream('tests/tests.html'), res);
    });

var args = process.argv.slice(2),
    port = args[0] || 8080;
app.listen(port, '127.0.0.1', function() {
    process.stdout.write('Development HTTP server started on localhost:' + port + '...');
});