/**
 * نرمال‌سازی متن فارسی
 * یکسان‌سازی حروف عربی به فارسی، اصلاح اعداد، فاصله‌گذاری، نیم‌فاصله و علائم.
 *
 * دو حالت:
 * - display: برای نمایش/ذخیره — نیم‌فاصله‌ها حفظ می‌شوند، اعراب دست‌نخورده می‌ماند.
 * - search:  برای جستجو — نیم‌فاصله‌ها به فاصله تبدیل و اعراب حذف می‌شوند.
 */

// کاراکترهای نامرئی
const CHARS = {
    ZWNJ: '\u200C',   // نیم‌فاصله
    ZWS: '\u200B',
    ZWJ: '\u200D',
    RLM: '\u200F',
    LRM: '\u200E',
    WJ: '\u2060',
    BOM: '\uFEFF',
    NBSP: '\u00A0',
    NNBSP: '\u202F',
};

// الگوی حروف فارسی/عربی
const PERSIAN_ARABIC_LETTER = '[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]';

class Normalizer {
    constructor({
        correctSpacing = true,
        removeDiacritics = true,
        removeSpecialsChars = true,
        decreaseRepeatedChars = true,
        persianStyle = true,
        persianNumbers = true,
        unicodesReplacement = true,
        seperateMi = true,
        mode = 'display'  // 'display' | 'search'
    } = {}) {
        this._correctSpacing = correctSpacing;
        this._removeDiacritics = removeDiacritics;
        this._removeSpecialsChars = removeSpecialsChars;
        this._decreaseRepeatedChars = decreaseRepeatedChars;
        this._persianStyle = persianStyle;
        this._persianNumber = persianNumbers;
        this._unicodesReplacement = unicodesReplacement;
        this._seperateMi = seperateMi;
        this._mode = mode;

        // نگاشت کاراکترهای عربی به فارسی
        this.translationSrc = "ؠػػؽؾؿكيٮٯٷٸٹٺٻټٽٿڀځٵٶٷٸٹٺٻټٽٿڀځڂڅڇڈډڊڋڌڍڎڏڐڑڒړڔڕږڗڙښڛڜڝڞڟڠڡڢڣڤڥڦڧڨڪګڬڭڮڰڱڲڳڴڵڶڷڸڹںڻڼڽھڿہۂۃۄۅۆۇۈۉۊۋۏۍێېۑےۓەۮۯۺۻۼۿݐݑݒݓݔݕݖݗݘݙݚݛݜݝݞݟݠݡݢݣݤݥݦݧݨݩݪݫݬݭݮݯݰݱݲݳݴݵݶݷݸݹݺݻݼݽݾݿࢠࢡࢢࢣࢤࢥࢦࢧࢨࢩࢪࢫࢮࢯࢰࢱࢬࢲࢳࢴࢶࢷࢸࢹࢺࢻࢼࢽﭐﭑﭒﭓﭔﭕﭖﭗﭘﭙﭚﭛﭜﭝﭞﭟﭠﭡﭢﭣﭤﭥﭦﭧﭨﭩﭮﭯﭰﭱﭲﭳﭴﭵﭶﭷﭸﭹﭺﭻﭼﭽﭾﭿﮀﮁﮂﮃﮄﮅﮆﮇﮈﮉﮊﮋﮌﮍﮎﮏﮐﮑﮒﮓﮔﮕﮖﮗﮘﮙﮚﮛﮜﮝﮞﮟﮠﮡﮢﮣﮤﮥﮦﮧﮨﮩﮪﮫﮬﮭﮮﮯﮰﮱﺀﺁﺃﺄﺅﺆﺇﺈﺉﺊﺋﺌﺍﺎﺏﺐﺑﺒﺕﺖﺗﺘﺙﺚﺛﺜﺝﺞﺟﺠﺡﺢﺣﺤﺥﺦﺧﺨﺩﺪﺫﺬﺭﺮﺯﺰﺱﺲﺳﺴﺵﺶﺷﺸﺹﺺﺻﺼﺽﺾﺿﻀﻁﻂﻃﻄﻅﻆﻇﻈﻉﻊﻋﻌﻍﻎﻏﻐﻑﻒﻓﻔﻕﻖﻗﻘﻙﻚﻛﻜﻝﻞﻟﻠﻡﻢﻣﻤﻥﻦﻧﻨﻩﻪﻫﻬﻭﻮﻯﻰﻱﻲﻳﻴىكي“” "
        this.translationDst = 'یککیییکیبقویتتبتتتبحاوویتتبتتتبحححچدددددددددررررررررسسسصصطعففففففققکککککگگگگگللللنننننهچهههوووووووووییییییهدرشضغهبببببببححددرسعععففکککممنننلررسححسرحاایییووییحسسکببجطفقلمییرودصگویزعکبپتریفقنااببببپپپپببببتتتتتتتتتتتتففففححححححححچچچچچچچچددددددددژژررککککگگگگگگگگگگگگننننننههههههههههییییءاااووااییییااببببتتتتثثثثججججححححخخخخددذذررززسسسسششششصصصصضضضضططططظظظظععععغغغغففففققققککککللللممممننننههههوویییییییکی"" '

        // نگاشت اعداد
        this.numberTranslationSrc = "0123456789%٠١٢٣٤٥٦٧٨٩";
        this.numberTranslationDst = "۰۱۲۳۴۵۶۷۸۹٪۰۱۲۳۴۵۶۷۸۹";

        // الگوهای regex برای حذف اعراب و کاراکترهای خاص
        this.diacriticsPattern = /[\u064b-\u0652\u0670\u06D6-\u06ED]/g;
        this.specialCharsPattern = /[\u0605\u0653-\u065f\u0610-\u061a\u061e\u06d4-\u06ed\u06fd-\u06fe\u08ad\u08d4-\u08ff\ufbb2-\ufbc1\ufc5e-\ufcf4\ufd3e-\ufd3f\ufe70-\ufe7f\ufdfa-\ufdfb]/g;

        // جایگزینی‌های خاص (لیگاتورها و نمادها)
        this.replacements = [
            ["﷽", "بسم الله الرحمن الرحیم"],
            ["﷼", "ریال"],
            ["[ﷰﷹ]", "صلی"],
            ["ﷲ", "الله"],
            ["ﷳ", "اکبر"],
            ["ﷴ", "محمد"],
            ["ﷵ", "صلعم"],
            ["ﷶ", "رسول"],
            ["ﷷ", "علیه"],
            ["ﷸ", "وسلم"],
            ["[ﻵﻶﻷﻸﻹﻺﻻﻼ]", "لا"]
        ];

        // الگوی تکرار حروف
        this.repeatCharPattern = /([آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی])\1{2,}/g;

        // RLM/LRM اشتباهی بین دو حرف فارسی/عربی (به‌جای نیم‌فاصله)
        this.misplacedDirectionMarkPattern = new RegExp(
            `(${PERSIAN_ARABIC_LETTER})([\u200E\u200F])(${PERSIAN_ARABIC_LETTER})`,
            'g'
        );
    }

    /** RLM/LRM اشتباهی که به‌جای نیم‌فاصله استفاده شده را اصلاح می‌کند */
    _fixMisplacedDirectionMarks(/** @type {string} */ text, /** @type {string} */ mode) {
        if (!text) return '';
        const replacement = mode === 'search' ? ' ' : CHARS.ZWNJ;
        return text.replace(this.misplacedDirectionMarkPattern, `$1${replacement}$3`);
    }

    /** حذف RLM/LRM باقیمانده */
    _removeStrayDirectionMarks(/** @type {string} */ text) {
        if (!text) return '';
        return text.replace(/[\u200E\u200F]/g, '');
    }

    /** نگاشت کاراکتر به کاراکتر بر اساس src→dst */
    translate(/** @type {string} */ text, /** @type {string} */ src, /** @type {string} */ dst) {
        let result = '';
        for (let ch of text) {
            let idx = src.indexOf(ch);
            result += idx >= 0 ? dst[idx] : ch;
        }
        return result;
    }

    /**
     * نرمال‌سازی متن ساده.
     * @param {string} text
     * @param {string} [mode] - 'display' | 'search'
     */
    _normalizeText(text, mode) {
        if (!text) return '';

        const currentMode = mode || this._mode;

        // ۱) اصلاح RLM/LRM اشتباهی
        text = this._fixMisplacedDirectionMarks(text, currentMode);
        // ۲) حذف RLM/LRM باقیمانده
        text = this._removeStrayDirectionMarks(text);

        // ۳) مدیریت کاراکترهای zero-width
        if (currentMode === 'search') {
            text = text.replace(/[\u200C\u200B\u200D\u2060\uFEFF\u00A0\u202F]/g, ' ');
        } else {
            // نیم‌فاصله (ZWNJ) حفظ می‌شود، بقیه حذف
            text = text.replace(/[\u200B\u200D\u2060\uFEFF]/g, '');
            text = text.replace(/[\u00A0\u202F]/g, ' ');
        }

        // نگاشت عربی → فارسی
        text = this.translate(text, this.translationSrc, this.translationDst);

        if (this._persianStyle) text = this.persianStyle(text);
        if (this._persianNumber) text = this.persianNumber(text);
        if (this._removeDiacritics) text = text.replace(this.diacriticsPattern, '');
        if (this._unicodesReplacement) text = this.unicodesReplacement(text);
        if (this._removeSpecialsChars) text = text.replace(this.specialCharsPattern, '');
        if (this._decreaseRepeatedChars) text = this.decreaseRepeatedChars(text);
        if (this._seperateMi) text = this.seperateMi(text, currentMode);
        if (this._correctSpacing) text = this.correctSpacing(text, currentMode);

        if (currentMode === 'search') {
            text = text.replace(/\s+/g, ' ');
        }

        return text.trim();
    }

    /** نرمال‌سازی برای نمایش (نیم‌فاصله حفظ می‌شود) */
    normalizeForDisplay(/** @type {string} */ text) {
        return this._normalizeText(text, 'display');
    }

    /** نرمال‌سازی برای جستجو (نیم‌فاصله/اعراب حذف می‌شوند) */
    normalizeForSearch(/** @type {string} */ text) {
        return this._normalizeText(text, 'search');
    }

    /** نرمال‌سازی متن ساده با حالت پیش‌فرض این نمونه */
    normalize(/** @type {string} */ text) {
        return this._normalizeText(text);
    }

    /** تبدیل به سبک فارسی (گیومه، ممیز، سه‌نقطه) */
    persianStyle(/** @type {string} */ text) {
        return text.replace(/"([^\n"]+)"/g, '«$1»')
                   .replace(/(\d+)\.(\d+)/g, '$1٫$2')
                   .replace(/ ?\.\.\./g, ' …');
    }

    /** تبدیل ارقام به فارسی */
    persianNumber(/** @type {string} */ text) {
        return this.translate(text, this.numberTranslationSrc, this.numberTranslationDst);
    }

    /** جایگزینی لیگاتورها و نمادهای یونیکد */
    unicodesReplacement(/** @type {string} */ text) {
        for (let [oldPattern, newStr] of this.replacements) {
            text = text.replace(new RegExp(oldPattern, 'g'), newStr);
        }
        return text;
    }

    /** کاهش حروف تکرارشده (بیش از ۲ بار) به ۲ بار */
    decreaseRepeatedChars(/** @type {string} */ text) {
        return text.replace(this.repeatCharPattern, '$1$1');
    }

    /**
     * جداسازی پیشوند «می/نمی» با نیم‌فاصله (یا فاصله در حالت جستجو)
     */
    seperateMi(/** @type {string} */ text, /** @type {string} */ mode = 'display') {
        const separator = mode === 'search' ? ' ' : CHARS.ZWNJ;
        return text.replace(/(?<![آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی\u200c\u200f\u200e])(ن?می)([آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]{2,})/g, `$1${separator}$2`);
    }

    /** اصلاح فاصله‌گذاری و علائم */
    correctSpacing(/** @type {string} */ text, /** @type {string} */ mode = 'display') {
        if (mode === 'search') {
            text = text.replace(/\s+/g, ' ');
        } else {
            text = text.replace(/ +/g, ' ');
        }
        text = text
            .replace(/\s*([.,،:;!؟?])\s*/g, '$1 ')
            .replace(/\s+$/g, '')
            .replace(/\s*\n\s*/g, '\n')
            .trim();
        return text;
    }
}

// نمونه‌های آماده
// displayNormalizer: نمایش/ذخیره — نیم‌فاصله و اعراب حفظ می‌شوند
const displayNormalizer = new Normalizer({
    removeDiacritics: false,
    mode: 'display'
});

// searchNormalizer: جستجو — نیم‌فاصله و اعراب حذف می‌شوند
const searchNormalizer = new Normalizer({
    removeDiacritics: true,
    mode: 'search'
});

/**
 * تابع کمکی نرمال‌سازی سریع.
 * @param {string} text
 * @param {boolean} [forSearch=false]
 * @returns {string}
 */
export function normalizePersian(text, forSearch = false) {
    if (!text) return '';
    return forSearch
        ? searchNormalizer.normalize(text)
        : displayNormalizer.normalize(text);
}

export {
    Normalizer,
    displayNormalizer,
    searchNormalizer,
    CHARS
};
export default Normalizer;
