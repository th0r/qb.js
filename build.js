// Устанавливаем в качестве рабочей директории папку текущен скрипта
process.chdir(__dirname);

var fs = require('fs'),
    util = require('util'),
    path = require('path'),
    ejs = require('ejs'),
    minjs = require('uglify-js'),
    PART_REGEXP = /\/\*\.\s\/\/\s(\w+)(?:\(([\w,_]+)\))?/ig,
    CORE_SRC_FILE = './qb/core.js',
    BUILT_DIR = './build';

// Меняем тэги для EJS-шаблона
ejs.open = '/*.';
ejs.close = '.*/';

// Получаем список частей исходника и их зависимости
var parts = {},
    deps = {},
    src = fs.readFileSync(CORE_SRC_FILE, 'utf8'),
    part;
while(part = PART_REGEXP.exec(src)) {
    parts[part[1]] = false;
    // Запоминаем зависимости этой части
    deps[part[1]] = part[2] ? part[2].split(',') : [];
}

var existingParts = Object.keys(parts);

// Парсим аргументы
var args = require('nomnom').options({
    parts: {
        position: 0,
        list: true,
        help: 'Parts, that will be built. Full build will be made by default.',
        'default': existingParts,
        callback: function(part) {
            return (existingParts.indexOf(part) >= 0) || 'Error. There is no part named "' + part + '".';
        }
    },
    compress: {
        abbr: 'c',
        help: 'Minimize output file using uglify.js',
        flag: true
    },
    tiny: {
        abbr: 't',
        help: 'Build only common utilites of qb.js. If set, all parts are excluded.',
        flag: true
    }
}).script('node build.js')
    .help('Available parts: ' + existingParts.join(', '))
    .parse();

// Включает часть в сборку, рекурсивно добавляя ее зависимости
function addPart(part) {
    parts[part] = true;
    deps[part].forEach(function(dep) {
        addPart(dep);
    });
}
if (!args.tiny) {
    args.parts.forEach(addPart);
}

// Генерируем информацию о собранных частях
var partsIncluded = [],
    partsOmmited = [];
for (part in parts) {
    (parts[part] ? partsIncluded : partsOmmited).push(part);
}

// Накладываем шаблон
parts.options = args;
var buildSrc = ejs.render(src, parts);

// Создаем директорию для собранных файлов
if (!path.existsSync(BUILT_DIR)) {
    fs.mkdirSync(BUILT_DIR);
}
// Пишем файл
var builtScriptFile = path.resolve(BUILT_DIR, path.basename(CORE_SRC_FILE));
fs.writeFileSync(builtScriptFile, buildSrc);
var builtInfo = util.format('Build process successful.\n' +
                            'Parts included: %s\n' +
                            'Parts ommited: %s\n' +
                            'File: "%s" (%d bytes)\n',
                            partsIncluded.join(', ') || 'no (tiny version)',
                            partsOmmited.join(', ') || 'no (full build)',
                            builtScriptFile, buildSrc.length);
if (args.compress) {
    var minifiedSrc = minjs(buildSrc),
        builtScriptMinFile = path.resolve(BUILT_DIR, path.basename(CORE_SRC_FILE, '.js') + '.min.js');
    fs.writeFileSync(builtScriptMinFile, minifiedSrc);
    var savedRatio = Math.floor((buildSrc.length - minifiedSrc.length) / buildSrc.length * 100);
    builtInfo += util.format('Minification successful.\n' +
                             'File: "%s" (%d bytes).\n' +
                             'Saved %d% of the original size.\n',
                             builtScriptMinFile, minifiedSrc.length, savedRatio);
}

process.stdout.write('\n' + builtInfo + '\n');