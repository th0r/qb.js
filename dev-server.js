var http = require('http'),
    fs = require('fs'),
    connect = require('connect'),
    util = require('util'),
    parseUrl = require('url').parse,
    parseQuery = require('querystring').parse,
    cp = require('child_process'),
    watch = require('watch');

function build() {
    console.log('\n*** Сборка библиотеки: ***\n');
    return cp.spawn(__dirname + '/build.js', ['./qb'], {
        stdio: 'inherit'
    });
}

// Создаем сервер с логгером
var app = connect().use(connect.logger({
    format: 'dev',
    immediate: true
}));

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
    // Редиректим на корень, откуда запускаем тесты
    .use(function(req, res) {
        if (parseUrl(req.url).pathname === '/') {
            util.pump(fs.createReadStream('tests/tests.html'), res);
        } else {
            res.writeHead(302, {
                'Location': '/'
            });
            res.end();
        }
    });

// Собираем библиотеку и запускаем сервер
build().on('exit', function (code) {
    if (code === 0) {
        // Запускаем сервер
        var args = process.argv.slice(2),
            port = args[0] || 8080;
        app.listen(port, '0.0.0.0', function () {
            process.stdout.write('\n*** Сервер запущен на localhost:' + port + '... ***\n');
        });
        
        // Мониторим изменения исходников и пересобираем библиотеку
        watch.createMonitor(__dirname + '/src', {
            interval: 1000
        }, function (monitor) {
            ['created', 'removed', 'changed'].forEach(function (event) {
                monitor.on(event, build);
            });
        });
    } else {
        console.error('\nБиблиотека не собралась!\n');
    }
});