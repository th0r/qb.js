var fs = require('fs'),
    util = require('util'),
    path = require('path'),
    ejs = require('ejs'),
    minjs = require('uglify-js'),
    wrench = require('wrench');

// Устанавливаем в качестве рабочей директории папку текущего скрипта
process.chdir(__dirname);

var PART_REGEXP = /\/\*\.\s\/\/\s(\w+)(?:\(([\w,_]+)\))?/ig,
    SRC_DIR = path.resolve('./qb'),
    BUILT_DIR = path.resolve('./build'),
    CORE_SRC = 'core.js';

// Получаем список частей исходника и их зависимости
var parts = {},
    deps = {},
    coreSrc = fs.readFileSync(path.join(SRC_DIR, CORE_SRC), 'utf8'),
    part;
while(part = PART_REGEXP.exec(coreSrc)) {
    parts[part[1]] = false;
    // Запоминаем зависимости этой части
    deps[part[1]] = part[2] ? part[2].split(',') : [];
}

var existingParts = Object.keys(parts);

// Парсим аргументы
var corePartsPassed = false;
var args = require('nomnom').options({
    core: {
        abbr: 'c',
        help: 'Собрать только ядро core.js. Через запятую указывается список частей ядра, которые нужно включить в сборку, ' +
              'либо одно из значений: "tiny" для сборки минимальной версии и "full" - для сборки полной версии ядра.',
        'default': false,
        callback: function(parts) {
            // Проверяем, существуют ли указанные части
            if (typeof parts === 'string') {
                if (parts !== 'tiny' && parts !== 'full') {
                    corePartsPassed = true;
                    parts = parts.split(',');
                    for (var i = 0, len = parts.length; i < len; i++) {
                        var part = parts[i];
                        if (existingParts.indexOf(part) === -1) {
                            return 'Ошибка! В ядре нет части с именем "' + part + '".'
                        }
                    }
                }
            }
        }
    },
    except: {
        abbr: 'e',
        help: 'Исключает перечисленные модули из сборки. Должно быть регулярным выражением, которое будет матчится на ' +
              'относительный путь к модулям.',
        'default': false
    },
    minify: {
        abbr: 'm',
        help: 'Минифицировать ли собранные файлы с помощью "uglify-js".',
        flag: true
    },
    nodejs: {
        abbr: 'n',
        help: 'Соберется Node.JS модуль. В него будут включены части "Deferred" и "Class", но это можно переопределить с ' +
              'помощью флага "--core=<part1,part2...partN>".',
        flag: true
    }
}).script('node build.js')
    .help('Список частей ядра: ' + existingParts.join(', '))
    .parse();

args.tiny = (args.core === 'tiny');

if (args.tiny) {
    args.parts = [];
} else if (corePartsPassed) {
    args.parts = args.core.split(',');
} else if (args.nodejs) {
    args.parts = ['ns', 'Class', 'Deferred'];
} else {
    args.parts = existingParts;
}

// Включает часть в сборку, рекурсивно добавляя ее зависимости
function addPart(part) {
    parts[part] = true;
    deps[part].forEach(function(dep) {
        addPart(dep);
    });
}
args.parts.forEach(addPart);

// Генерируем информацию о собранных частях
var partsIncluded = [],
    partsOmmited = [];
for (part in parts) {
    (parts[part] ? partsIncluded : partsOmmited).push(part);
}

// Меняем тэги для EJS-шаблона
ejs.open = '/*.';
ejs.close = '.*/';
parts.options = args;
// Накладываем шаблон
var coreOut = ejs.render(coreSrc, parts);

// Создаем директорию для собранных файлов либо чистим ее
if (path.existsSync(BUILT_DIR)) {
    wrench.rmdirSyncRecursive(BUILT_DIR);
}
fs.mkdirSync(BUILT_DIR);

function log(filepath, src, minified) {
    var info = 'Файл "' + filepath + '" собран.';
    if (minified) {
        var savedRatio = Math.floor((src.length - minified.length) / src.length * 100);
        info += util.format(' Сжатие - %d% (%d к %d байт)',
                            savedRatio, minified.length, src.length);
    }
    process.stdout.write(info + '\n');
}

// Пишем ядро
if (args.minify) {
    var coreOutMin = minjs(coreOut);
}
fs.writeFileSync(path.join(BUILT_DIR, CORE_SRC), coreOutMin || coreOut);
log(CORE_SRC, coreOut, coreOutMin);
process.stdout.write(util.format('Части, вошедшие в ядро: %s\n' +
                                 'Не вошли в ядро: %s\n',
                                 partsIncluded.join(', ') || 'собралась минимальная версия',
                                 partsOmmited.join(', ') || 'собралась полная версия'));

function writeFile(filePath, outFilePath, minify) {
    fs.readFile(filePath, 'utf8', function(err, data) {
        if (minify) {
            var compressed = minjs(data);
        }
        fs.writeFile(outFilePath, compressed || data, 'utf8');
        log(filePath, data, compressed);
    });
}

if (!args.core) {
    var except = args.except ? new RegExp(args.except, 'i') : null;
    process.chdir('qb');
    wrench.readdirRecursive('.', function(err, files) {
        if (files) {
            files.forEach(function(file) {
                fs.stat(file, function(err, info) {
                    if (info.isFile()) {
                        var filename = path.basename(file);
                        if (filename === CORE_SRC || (except && except.test(file))) {
                            return false;
                        }
                        var dir = path.join(BUILT_DIR, path.dirname(file));
                        if (!path.existsSync(dir)) {
                            fs.mkdirSync(dir);
                        }
                        var outfile = path.join(dir, filename);
                        writeFile(file, outfile, args.minify);
                    }
                });
            });
        }
    });
}
