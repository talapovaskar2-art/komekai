const bi = (ru, kk) => ({ ru, kk })
const lesson = (id, title, minutes, theory, example, exercise, video) => ({ id, title, minutes, theory, example, exercise, video })

export const subjects = [
  {
    id: 'math', title: bi('Математика', 'Математика'), description: bi('Разбираем закономерности шаг за шагом.', 'Заңдылықтарды қадам сайын түсінеміз.'), accent: '#a7bc88',
    units: [{ id: 'math-equations', title: bi('Уравнения', 'Теңдеулер'), lessons: [
      lesson('math-balance', bi('Равенство как весы', 'Теңдік — таразы'), 7,
        bi('Обе стороны уравнения должны оставаться равными. Что делаешь слева, делай и справа.', 'Теңдеудің екі жағы тең болуы керек. Сол жаққа не істесең, оң жаққа да соны істе.'),
        bi('x + 4 = 9 → вычитаем 4 с обеих сторон → x = 5.', 'x + 4 = 9 → екі жақтан 4 аламыз → x = 5.'),
        { id: 'math-balance-1', type: 'input', question: bi('x + 6 = 14. Чему равен x?', 'x + 6 = 14. x нешеге тең?'), answer: '8', explanation: bi('Вычти 6 из обеих частей: x = 14 − 6 = 8.', 'Екі жақтан 6 ал: x = 14 − 6 = 8.'), errorPattern: 'inverse-operation' },
        [bi('Две чаши весов равны.', 'Таразының екі табағы тең.'), bi('Убираем одинаковое число с обеих сторон.', 'Екі жақтан бірдей санды аламыз.'), bi('Получаем значение x.', 'x мәнін табамыз.')]),
      lesson('math-linear', bi('Линейное уравнение', 'Сызықтық теңдеу'), 10,
        bi('Сначала убери прибавленное число, потом раздели на коэффициент при x.', 'Алдымен қосылған санды алып таста, содан кейін x алдындағы санға бөл.'),
        bi('3x + 7 = 22 → 3x = 15 → x = 5.', '3x + 7 = 22 → 3x = 15 → x = 5.'),
        { id: 'math-linear-1', type: 'input', question: bi('3x + 7 = 22. Чему равен x?', '3x + 7 = 22. x нешеге тең?'), answer: '5', explanation: bi('Вычти 7, затем раздели на 3. Ответ: 5.', '7-ні алып, 3-ке бөл. Жауап: 5.'), errorPattern: 'sign-transfer' },
        [bi('Сначала изолируем 3x.', 'Алдымен 3x-ті жеке қалдырамыз.'), bi('Вычитаем 7 из обеих частей.', 'Екі жақтан 7 аламыз.'), bi('Делим обе части на 3.', 'Екі жақты 3-ке бөлеміз.')])
    ] }]
  },
  {
    id: 'science', title: bi('Естествознание', 'Жаратылыстану'), description: bi('Исследуем мир через наблюдение и вопросы.', 'Әлемді бақылау және сұрақ қою арқылы зерттейміз.'), accent: '#90b4a1',
    units: [{ id: 'science-cell', title: bi('Живая клетка', 'Тірі жасуша'), lessons: [
      lesson('science-cell-parts', bi('Из чего состоит клетка', 'Жасушаның құрылысы'), 8,
        bi('Клеточная мембрана защищает клетку, цитоплазма заполняет её, а ядро хранит инструкции.', 'Жасуша мембранасы қорғайды, цитоплазма ішін толтырады, ал ядро нұсқауларды сақтайды.'),
        bi('Представь школу: стены — мембрана, помещения — цитоплазма, план работы — ядро.', 'Мектепті елестет: қабырға — мембрана, бөлмелер — цитоплазма, жоспар — ядро.'),
        { id: 'science-cell-1', type: 'choice', question: bi('Какая часть клетки хранит наследственную информацию?', 'Жасушаның қай бөлігі тұқым қуалайтын ақпаратты сақтайды?'), options: [bi('Ядро', 'Ядро'), bi('Мембрана', 'Мембрана'), bi('Цитоплазма', 'Цитоплазма')], answer: '0', explanation: bi('Наследственная информация находится в ядре.', 'Тұқым қуалайтын ақпарат ядрода болады.'), errorPattern: 'cell-functions' },
        [bi('Смотрим на границу клетки.', 'Жасушаның шекарасын қараймыз.'), bi('Различаем внутренние части.', 'Ішкі бөліктерді ажыратамыз.'), bi('Находим ядро и его роль.', 'Ядроны және оның қызметін табамыз.')]),
      lesson('science-ecosystem', bi('Цепи питания', 'Қоректік тізбектер'), 9,
        bi('Энергия переходит от растений к травоядным, затем к хищникам.', 'Энергия өсімдіктерден шөпқоректілерге, содан соң жыртқыштарға өтеді.'),
        bi('Трава → кузнечик → птица.', 'Шөп → шегіртке → құс.'),
        { id: 'science-chain-1', type: 'order', question: bi('Расположи цепь питания по порядку.', 'Қоректік тізбекті ретімен орналастыр.'), options: [bi('Лиса', 'Түлкі'), bi('Трава', 'Шөп'), bi('Заяц', 'Қоян')], answer: ['1','2','0'], explanation: bi('Трава → заяц → лиса.', 'Шөп → қоян → түлкі.'), errorPattern: 'food-chain-order' },
        [bi('Сначала источник энергии — растение.', 'Алдымен энергия көзі — өсімдік.'), bi('Потом тот, кто ест растение.', 'Содан соң өсімдікті жейтін жануар.'), bi('Завершает хищник.', 'Соңында жыртқыш келеді.')])
    ] }]
  },
  {
    id: 'kazakh', title: bi('Казахский язык', 'Қазақ тілі'), description: bi('Слова, смысл и уверенная речь.', 'Сөз, мағына және сенімді сөйлеу.'), accent: '#c7a589',
    units: [{ id: 'kazakh-words', title: bi('Слова и предложение', 'Сөз бен сөйлем'), lessons: [
      lesson('kazakh-synonyms', bi('Близкие по смыслу слова', 'Мағынасы жақын сөздер'), 7,
        bi('Синонимы звучат по-разному, но передают близкий смысл.', 'Синонимдер әртүрлі айтылғанымен, мағынасы жақын болады.'),
        bi('Әдемі и сұлу оба означают «красивый».', 'Әдемі мен сұлу сөздерінің мағынасы жақын.'),
        { id: 'kazakh-syn-1', type: 'choice', question: bi('Выбери синоним слова «әдемі».', '«Әдемі» сөзінің синонимін таңда.'), options: [bi('сұлу', 'сұлу'), bi('ұзын', 'ұзын'), bi('суық', 'суық')], answer: '0', explanation: bi('«Сұлу» близко по значению к «әдемі».', '«Сұлу» мен «әдемі» мағынасы жақын.'), errorPattern: 'synonyms' },
        [bi('Слушаем слово.', 'Сөзді тыңдаймыз.'), bi('Сравниваем значения.', 'Мағыналарын салыстырамыз.'), bi('Находим близкое по смыслу.', 'Мағынасы жақын сөзді табамыз.')]),
      lesson('kazakh-order', bi('Порядок слов', 'Сөздердің реті'), 8,
        bi('В простом казахском предложении сказуемое часто стоит в конце.', 'Қарапайым қазақ сөйлемінде баяндауыш көбіне соңында тұрады.'),
        bi('Мен кітап оқимын. — Я читаю книгу.', 'Мен кітап оқимын.'),
        { id: 'kazakh-order-1', type: 'order', question: bi('Составь предложение «Я читаю книгу».', '«Мен кітап оқимын» сөйлемін құрастыр.'), options: [bi('оқимын', 'оқимын'), bi('Мен', 'Мен'), bi('кітап', 'кітап')], answer: ['1','2','0'], explanation: bi('Правильный порядок: Мен кітап оқимын.', 'Дұрыс реті: Мен кітап оқимын.'), errorPattern: 'word-order' },
        [bi('Называем того, кто действует.', 'Іс иесін атаймыз.'), bi('Добавляем предмет.', 'Затты қосамыз.'), bi('Действие ставим в конец.', 'Қимылды соңына қоямыз.')])
    ] }]
  },
  {
    id: 'russian', title: bi('Русский язык', 'Орыс тілі'), description: bi('Понимаем текст и строим ясные фразы.', 'Мәтінді түсініп, ойды анық жеткіземіз.'), accent: '#b3a1bd',
    units: [{ id: 'russian-text', title: bi('Смысл текста', 'Мәтін мағынасы'), lessons: [
      lesson('russian-main-idea', bi('Главная мысль', 'Негізгі ой'), 8,
        bi('Главная мысль отвечает на вопрос: что автор хотел сказать всем текстом?', 'Негізгі ой: автор бүкіл мәтін арқылы нені айтқысы келді?'),
        bi('Если в тексте герой помог другу, мысль может быть о взаимопомощи.', 'Кейіпкер досына көмектессе, негізгі ой өзара көмек туралы болуы мүмкін.'),
        { id: 'russian-idea-1', type: 'choice', question: bi('«Аня поделилась книгой, и подруга смогла подготовиться». Какая главная мысль?', '«Аня кітабын бөлісті, досы дайындала алды». Негізгі ой қандай?'), options: [bi('Помощь делает учёбу легче', 'Көмек оқуды жеңілдетеді'), bi('Книги бывают тяжёлыми', 'Кітаптар ауыр болады'), bi('Подруги любят гулять', 'Достар серуендегенді ұнатады')], answer: '0', explanation: bi('Смысл истории — в помощи другу.', 'Оқиғаның мағынасы — досқа көмектесу.'), errorPattern: 'main-idea' },
        [bi('Читаем короткий текст.', 'Қысқа мәтінді оқимыз.'), bi('Отделяем детали от смысла.', 'Бөлшектерді мағынадан ажыратамыз.'), bi('Формулируем мысль.', 'Негізгі ойды айтамыз.')]),
      lesson('russian-punctuation', bi('Знак в конце предложения', 'Сөйлем соңындағы белгі'), 7,
        bi('Точка завершает сообщение. Вопросительный знак показывает вопрос.', 'Нүкте хабарды аяқтайды. Сұрақ белгісі сұрақты білдіреді.'),
        bi('Ты прочитал книгу? — это вопрос.', '«Ты прочитал книгу?» — бұл сұрақ.'),
        { id: 'russian-mark-1', type: 'choice', question: bi('Какой знак нужен: «Ты готов к уроку__»?', '«Ты готов к уроку__» сөйлеміне қандай белгі керек?'), options: [bi('?', '?'), bi('.', '.'), bi('!', '!')], answer: '0', explanation: bi('Это вопрос, поэтому нужен вопросительный знак.', 'Бұл сұрақ, сондықтан сұрақ белгісі керек.'), errorPattern: 'punctuation' },
        [bi('Слушаем интонацию.', 'Дауыс ырғағын тыңдаймыз.'), bi('Определяем цель фразы.', 'Сөйлем мақсатын анықтаймыз.'), bi('Выбираем знак.', 'Белгіні таңдаймыз.')])
    ] }]
  },
  {
    id: 'english', title: bi('Английский язык', 'Ағылшын тілі'), description: bi('Говорим о повседневном простыми фразами.', 'Күнделікті өмір туралы қарапайым сөйлемдер құрамыз.'), accent: '#a2afc8',
    units: [{ id: 'english-past', title: bi('Прошедшее время', 'Өткен шақ'), lessons: [
      lesson('english-past-simple', bi('Past Simple: начало', 'Past Simple: бастау'), 8,
        bi('Past Simple описывает завершённое действие в прошлом. У правильных глаголов добавляем -ed.', 'Past Simple өткенде аяқталған әрекетті білдіреді. Дұрыс етістіктерге -ed қосылады.'),
        bi('I play → I played yesterday.', 'I play → I played yesterday.'),
        { id: 'english-past-1', type: 'choice', question: bi('Как сказать «Я играл вчера»?', '«Мен кеше ойнадым» қалай айтылады?'), options: [bi('I played yesterday', 'I played yesterday'), bi('I play yesterday', 'I play yesterday'), bi('I playing yesterday', 'I playing yesterday')], answer: '0', explanation: bi('Завершённое действие вчера: played.', 'Кеше аяқталған әрекет: played.'), errorPattern: 'past-tense' },
        [bi('Находим слово yesterday.', 'yesterday сөзін табамыз.'), bi('Выбираем прошедшее время.', 'Өткен шақты таңдаймыз.'), bi('Добавляем -ed к play.', 'play сөзіне -ed қосамыз.')]),
      lesson('english-questions', bi('Вопросы с did', 'Did арқылы сұрақтар'), 9,
        bi('В вопросе о прошлом ставим did перед подлежащим, а основной глагол возвращаем в начальную форму.', 'Өткен шақ сұрағында did бастауыштың алдына келеді, негізгі етістік бастапқы түрінде болады.'),
        bi('Did you play yesterday?', 'Did you play yesterday?'),
        { id: 'english-did-1', type: 'order', question: bi('Собери вопрос «Ты играл вчера?»', '«Сен кеше ойнадың ба?» сұрағын құрастыр.'), options: [bi('play', 'play'), bi('Did', 'Did'), bi('yesterday?', 'yesterday?'), bi('you', 'you')], answer: ['1','3','0','2'], explanation: bi('Did you play yesterday?', 'Did you play yesterday?'), errorPattern: 'question-order' },
        [bi('Начинаем с Did.', 'Did сөзінен бастаймыз.'), bi('Добавляем you.', 'you сөзін қосамыз.'), bi('Глагол оставляем в начальной форме.', 'Етістікті бастапқы түрінде қалдырамыз.')])
    ] }]
  }
]

export const allLessons = subjects.flatMap(subject => subject.units.flatMap(unit => unit.lessons.map(item => ({ ...item, subjectId: subject.id, unitId: unit.id }))))
export const getLesson = id => allLessons.find(item => item.id === id)
export const localize = (value, locale) => value?.[locale === 'kk' ? 'kk' : 'ru'] || value?.ru || ''
export function publicCatalog() {
  return subjects.map(subject => ({ ...subject, units: subject.units.map(unit => ({ ...unit, lessons: unit.lessons.map(item => ({ ...item, subjectId: subject.id, unitId: unit.id, exercise: { ...item.exercise, answer: undefined, explanation: undefined, errorPattern: undefined } })) })) }))
}

export const diagnosticQuestions = [
  { id: 'math-basic', domain: 'math', prompt: bi('x + 5 = 12. Чему равен x?', 'x + 5 = 12. x нешеге тең?'), options: [bi('5','5'),bi('7','7'),bi('17','17')], answer: 1 },
  { id: 'math-linear', domain: 'math', prompt: bi('2x = 18. Чему равен x?', '2x = 18. x нешеге тең?'), options: [bi('9','9'),bi('16','16'),bi('20','20')], answer: 0 },
  { id: 'reading-main', domain: 'reading', prompt: bi('«Дана каждый день поливала росток. Через неделю появился лист». Что произошло благодаря её заботе?', '«Дана күнде өскінді суарды. Бір аптадан соң жапырақ шықты». Оның күтімі нені өзгертті?'), options: [bi('Появился лист','Жапырақ шықты'),bi('Пошёл дождь','Жаңбыр жауды'),bi('Росток исчез','Өскін жоғалды')], answer: 0 },
  { id: 'instructions', domain: 'attention', prompt: bi('Выбери только чётное число, которое больше 6.', '6-дан үлкен жұп санды ғана таңда.'), options: [bi('5','5'),bi('8','8'),bi('9','9')], answer: 1 },
  { id: 'science', domain: 'science', prompt: bi('Что необходимо растению для роста?', 'Өсімдіктің өсуіне не қажет?'), options: [bi('Свет и вода','Жарық пен су'),bi('Только камни','Тек тас'),bi('Только темнота','Тек қараңғылық')], answer: 0 },
  { id: 'language', domain: 'language', prompt: bi('Выбери слово, близкое по смыслу к «быстрый».', '«Жылдам» сөзіне мағынасы жақын сөзді таңда.'), options: [bi('Скорый','Тез'),bi('Тихий','Тыныш'),bi('Длинный','Ұзын')], answer: 0 },
  { id: 'english', domain: 'english', prompt: bi('Выбери фразу о вчерашнем дне.', 'Кешегі күн туралы сөйлемді таңда.'), options: [bi('I played yesterday','I played yesterday'),bi('I play every day','I play every day'),bi('I will play','I will play')], answer: 0 },
  { id: 'preferred-format', domain: 'preference', prompt: bi('Как тебе удобнее понять новую тему?', 'Жаңа тақырыпты қалай түсінген ыңғайлы?'), options: [bi('Пошагово','Қадамдап'),bi('На рисунке','Суретпен'),bi('На примере','Мысалмен')], answer: null }
]

export function educationalProfile(answers) {
  const byDomain = {}
  let correct = 0
  for (const question of diagnosticQuestions) {
    const reply = answers.find(item => item.id === question.id)
    if (question.answer === null) continue
    const good = Number(reply?.choice) === question.answer
    const domain = byDomain[question.domain] || { correct: 0, total: 0, durationMs: 0 }
    byDomain[question.domain] = { correct: domain.correct + Number(good), total: domain.total + 1, durationMs: domain.durationMs + (Number(reply?.durationMs) || 0) }
    if (good) correct++
  }
  const preferred = ['step','visual','example'][Number(answers.find(item => item.id === 'preferred-format')?.choice) || 0]
  const knowledgeGaps = Object.entries(byDomain).filter(([, value]) => value.correct < value.total).map(([domain]) => domain)
  const longResponseCount = Object.values(byDomain).filter(value => value.durationMs > 45000).length
  return { score: correct, total: 7, byDomain, knowledgeGaps, preferredFormat: preferred, lessonMinutes: longResponseCount >= 2 ? 7 : 10, pace: longResponseCount >= 2 ? 'gentle' : 'steady', attentionConsistency: longResponseCount >= 2 ? 'short-blocks' : 'standard', note: 'educational-assessment-only' }
}
