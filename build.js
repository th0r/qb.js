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

// Получаем список частей исходника
var parts = {},
    deps = {},
    src = fs.readFileSync(CORE_SRC_FILE, 'utf8'),
    part;
while(part = PART_REGEXP.exec(src)) {
    parts[part[1]] = false;
    // Запоминаем зависимости этой части
    deps[part[1]] = part[2] ? part[2].split(',') : [];
}

// Включает часть в сборку, рекурсивно добавляя ее зависимости
function addPart(part) {
    parts[part] = true;
    deps[part].forEach(function(dep) {
        addPart(dep);
    });
}

// Обрабатываем аргументы командной строки
var args = process.argv.slice(2),
    partsPassed = false,
    argParts = {},
    options = {};
args.forEach(function(arg) {
    if (/^--/.test(arg)) {
        // Выставляем флаги (--compress и т.д.)
        options[arg.substr(2)] = true;
    } else {
        if (arg in parts) {
            partsPassed = true;
            // Включаем выбранные части и их зависимости
            addPart(arg);
        } else {
            process.stderr.write(util.format('Error: There is no part named "%s"\n', arg));
            process.exit(1);
        }
    }
});

// Если никаких частей не передано и нет флага "--tiny", то собираем все части
if (!partsPassed && !options.tiny) {
    options.full = true;
    for (part in parts) {
        parts[part] = true;
    }
}

// Генерируем информацию о собранных частях
var partsIncluded = [],
    partsOmmited = [];
for (part in parts) {
    (parts[part] ? partsIncluded : partsOmmited).push(part);
}

// Накладываем шаблон
parts.options = options;
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
if (options.compress) {
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