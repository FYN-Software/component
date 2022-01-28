
declare namespace Intl
{
    interface Locale
    {
        baseName: string;
        calendar: Calendar;
        calendars: Array<Calendar>;
        caseFirst: 'upper'|'lower'|false;
        collation: Collation;
        hourCycle: HourCycle;
        hourCycles: Array<HourCycle>;
        language: string;
        numberingSystem: NumberingSystem;
        numberingSystems: Array<NumberingSystem>;
        numeric: boolean;
        region: string;
        script: string;
        textInfo: TextInfo;
        timeZones: Array<string>;
        weekInfo: WeekElements;
        maximize(): Locale;
        minimize(): Locale;
        toString(): string;
    }

    interface LocaleConstructor
    {
        new (tag: string, options?: {}): Locale;
    }

    var Locale: LocaleConstructor;

    // NOTE(Chris Kruining) 11-11-2021 - based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/calendar
    enum Calendar
    {
        ArabicCivil = 'roc',
        Buddhist = 'buddhist',
        Chinese = 'chinese',
        Coptic = 'coptic',
        Korean = 'dangi',
        EthiopicAmeteAlem = 'ethioaa',
        EthiopicAmeteMihret = 'ethiopic',
        Gregorian = 'gregory',
        Hebrew = 'hebrew',
        Indian = 'indian',
        Islamic = 'islamic',
        IslamicUmmAlQura = 'islamic-umalqura',
        IslamicTabularAstronomical = 'islamic-tbla',
        IslamicTabularCivil = 'islamic-civil',
        IslamicSaudiArabia = 'islamic-rgsa',
        ISO = 'iso8601',
        Japanese = 'japanese',
        Persian = 'persian',
    }

    // NOTE(Chris Kruining) 11-11-2021 - based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/collation
    enum Collation
    {
        Compatibility = 'compat',
        Dictionary = 'dict',
        DefaultUnicodeCollationElementTable = 'ducet',
        Emoji = 'emoji',
        European = 'eor',
        Phonebook = 'phonebk',
        Phonetic = 'phonetic',
        Pinyin = 'pinyin',
        Reformed = 'reformed',
        Search = 'search',
        SearchKorean = 'searchjl',
        Standard = 'standard',
        Traditional = 'trad',
        PinyinLatin = 'gb2312',
        PinyinLatinHan = 'big5han',
        PinyinLatinUnihan = 'unihan',
        PinyinLatinZhuyin = 'zhuyin',
        PinyinLatinStroke = 'stroke',
    }

    // NOTE(Chris Kruining) 11-11-2021 - based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/hourCycle
    type HourCycle = 'h11'|'h12'|'h23'|'h24';

    // NOTE(Chris Kruining) 11-11-2021 - based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/numberingSystem
    enum NumberingSystem
    {
        Adlam = 'adlm',
        Ahom = 'ahom',
        ArabicIndic = 'arab',
        ArabicIndicExtended = 'arabext',
        ArmenianUpperCase = 'armn',
        ArmenianLowerCase = 'armnlow',
        Balinese = 'bali',
        Bengali = 'beng',
        Bhaiksuki = 'bhks',
        Brahmi = 'brah',
        Chakma = 'cakm',
        Cham = 'cham',
        Cyrillic = 'cyrl',
        Devanagari = 'deva',
        Ethiopic = 'ethi',
        Financial = 'finance',
        FullWidth = 'fullwide',
        Georgian = 'geor',
        GunjalaGondi = 'gong',
        MasaramGondi = 'gonm',
        GreekUpperCase = 'grek',
        GreekLowerCase = 'greklow',
        Gujarati = 'gujr',
        Gurmukhi = 'guru',
        HanTraditionalDays = 'hanidays',
        HanTraditionalNumerals = 'hant',
        HanTraditionalFinancial = 'hantfin',
        HanDecimal = 'hanidec',
        HanNumerals = 'hans',
        HanFinancial = 'hansfin',
        Hebrew = 'hebr',
        PahawhHmong = 'hmng',
        NyiakengPuachueHmong = 'hmnp',
        Javanese = 'java',
        JapaneseNumerals = 'jpan',
        JapaneseFinancial = 'jpanfin',
        JapaneseGannen = 'jpanyear',
        KayahLi = 'kali',
        Khmer = 'khmr',
        Kannada = 'knda',
        TaiThamHora = 'lana',
        TaiTham = 'lanatham',
        Lao = 'laoo',
        Latin = 'latn',
        Lepcha = 'lepc',
        Limbu = 'limb',
        MathematicalBold = 'mathbold',
        MathematicalDoubleStruck = 'mathdbl',
        MathematicalMonoSpace = 'mathmono',
        MathematicalSansSerif = 'mathsans',
        MathematicalSansSerifBold = 'mathsanb',
        Malayalam = 'mlym',
        Modi = 'modi',
        Mongolian = 'mong',
        Mro = 'mroo',
        MeeteiMayek = 'mtei',
        Myanmar = 'mymr',
        MyanmarShan = 'mymrshan',
        MyanmarTaiLaing = 'mymrtlng',
        Native = 'native',
        Newa = 'newa',
        NKo = 'nkoo',
        OlChiki = 'olck',
        Oriya = 'orya',
        Osmanya = 'osma',
        HanifiRohingya = 'rohg',
        RomanUpperCase = 'roman',
        RomanLowerCase = 'romanlow',
        Saurashtra = 'saur',
        Sharada = 'shrd',
        Khudawadi = 'sind',
        SinhalaLith = 'sinh',
        SoraSompeng = 'sora',
        Sundanese = 'sund',
        Takri = 'takr',
        NewTaiLue = 'talu',
        Tamil = 'taml',
        TamilDecimal = 'tamldec',
        Telugu = 'telu',
        Thai = 'thai',
        Tirhuta = 'tirh',
        Tibetan = 'tibt',
        Traditional = 'traditio',
        Vai = 'vaii',
        WarangCiti = 'wara',
        Wancho = 'wcho',
    }

    interface TextInfo
    {
        direction: 'ltr'|'rtl';
    }

    interface WeekElements
    {
        firstDay: number;
        weekendStart: number;
        weekendEnd: number;
        minimalDays: number;
    }
}
