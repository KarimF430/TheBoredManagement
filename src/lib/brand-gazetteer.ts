import { readFileSync } from 'fs'
import { BRAND_MASTER } from './brand-master'

export interface BrandEntry {
  canonical: string
  aliases: string[]
  category: string
  subCategory: string
  parentBrand?: string
}

export interface Gazetteer {
  brands: BrandEntry[]
  byCanonical: Map<string, BrandEntry>
  byAlias: Map<string, BrandEntry>
  categories: Map<string, BrandEntry[]>
  allSearchTerms: string[]
}

const MANUAL_ALIASES: Record<string, string[]> = {
  "Samsung": ["galaxy", "one ui", "galaxy s", "galaxy note", "galaxy z"],
  "Apple": ["iphone", "ipad", "macbook", "airpods", "apple watch", "ios"],
  "OnePlus": ["one plus", "op", "oxygen os", "nord"],
  "Xiaomi": ["mi", "miui", "redmi", "poco", "redmi note"],
  "realme": ["real me", "realme ui"],
  "Google": ["pixel", "nest", "chromecast", "google home"],
  "Nothing": ["nothing phone", "glyph"],
  "Nokia": ["nokia", "hmd"],
  "Motorola": ["moto", "moto g", "moto e", "edge"],
  "boAt": ["boat", "bo at", "boat lifestyle", "boAt rocker"],
  "Sony": ["playstation", "ps5", "ps4", "dualsense", "xperia"],
  "JBL": ["jbl flip", "jbl charge", "jbl go"],
  "Bose": ["bose quietcomfort", "bose earbuds"],
  "Marshall": ["marshall speaker", "marshall headphones"],
  "Sennheiser": ["sennhiser", "sennheiser momentum"],
  "Coca-Cola": ["coke", "coca cola", "thums up", "sprite", "fanta", "minute maid"],
  "Nike": ["air jordan", "jordan", "airmax", "air max", "nike air"],
  "Adidas": ["adidas originals", "ultraboost", "yeezy"],
  "Puma": ["puma sports"],
  "Reebok": ["reebok classic"],
  "HP": ["hewlett packard", "hp pavilion", "hp spectre", "hp omen"],
  "Dell": ["dell xps", "dell inspiron", "dell alienware", "alienware"],
  "Lenovo": ["lenovo legion", "lenovo ideaPad", "lenovo thinkpad"],
  "Asus": ["asus rog", "rog", "asus zenfone", "zenbook", "tuf gaming"],
  "Acer": ["acer nitro", "acer predator", "aspire"],
  "MSI": ["msi gaming", "msi katana"],
  "Intel": ["intel core", "intel i7", "intel i5", "intel i9", "core i7", "core i5", "core i9"],
  "AMD": ["amd ryzen", "ryzen", "radeon", "rx 7900", "rx 7800"],
  "Nvidia": ["nvidia rtx", "rtx 4090", "rtx 4080", "rtx 4070", "geforce"],
  "LG": ["lg electronics", "lg oled", "lg gram"],
  "Panasonic": ["panasonic india"],
  "Whirlpool": ["whirlpool india"],
  "Bosch": ["bosch india", "bosch power"],
  "Prestige": ["prestige cooker", "prestige mixer", "prestige pressure cooker", "prestige mixer grinder", "prestige cookware"],
  "Hawkins": ["hawkins cooker", "hawkins pressure", "hawkins pressure cooker"],
  "Philips": ["philips india", "philips hue", "philips airfryer"],
  "Havells": ["havells india", "havells fan", "havells mixer"],
  "Pigeon": ["pigeon cooker", "pigeon mixer", "pigeon baby", "pigeon gas stove"],
  "Lakme": ["lakme absolute", "lakme 9to5"],
  "Maybelline": ["maybelline new york", "maybelline fit me"],
  "L'Oreal": ["loreal paris", "l'oreal paris", "loreal", "l'oreal"],
  "Mamaearth": ["mama earth"],
  "Nivea": ["nivea india"],
  "Pond's": ["ponds", "pond's"],
  "Garnier": ["garnier men", "garnier ultra"],
  "Colgate": ["colgate maxfresh", "colgate total"],
  "Dettol": ["dettol soap", "dettol handwash"],
  "Surf Excel": ["surf excel matic"],
  "Ariel": ["ariel matic"],
  "Tide": ["tide detergent"],
  "Harpic": ["harpic power plus"],
  "Asian Paints": ["asian paints apex", "asian paints royale"],
  "HUL": ["hindustan unilever", "hul"],
  "ITC": ["itc limited", "itc foods"],
  "Tata": ["tata tea", "tata salt", "tata sky", "tata cliq", "tata 1mg"],
  "Reliance": ["reliance digital", "reliance jio", "jio", "jiomart"],
  "Adani": ["adani group"],
  "Godrej": ["godrej interio", "godrej appliances", "godrej locks", "godrej ac", "godrej fridge"],
  "Bajaj": ["bajaj electricals", "bajaj finserv", "bajaj allianz", "bajaj mixer", "bajaj cooker"],
  "TCS": ["tata consultancy services"],
  "Infosys": ["infy"],
  "Wipro": ["wipro lighting", "wipro led"],
  "Zomato": ["zomato gold"],
  "Swiggy": ["swiggy instamart"],
  "Paytm": ["paytm mall", "paytm upi"],
  "PhonePe": ["phone pe"],
  "Google Pay": ["gpay", "google pay india"],
  "Amazon": ["amazon india", "amazon prime", "alexa"],
  "Flipkart": ["flipkart plus", "flipkart big billion"],
  "Meesho": ["meesho app"],
  "Myntra": ["myntra fashion"],
  "Nykaa": ["nykaa beauty", "nykaa fashion"],
  "Croma": ["croma retail"],
  "Reliance Digital": ["reliance digital store"],
  "Vijay Sales": ["vijay sales india"],
  "Titan": ["titan company", "titan raga", "titan watch"],
  "Fastrack": ["fastrack watch", "fastrack accessories", "fastrack sunglasses"],
  "Raymond": ["raymond group", "raymond shirt"],
  "Levi's": ["levis", "levis india"],
  "Decathlon": ["decathlon india", "decathlon sports"],
  "Wildcraft": ["wildcraft india", "wildcraft bags"],
  "American Tourister": ["american tourister india"],
  "Samsonite": ["samsonite india"],
  "Butterfly": ["butterfly mixer", "butterfly gas stove", "butterfly mixer grinder"],
  "Borosil": ["borosil glass", "borosil bottle", "borosil cookware"],
  "Milton": ["miltonthermos", "milton bottle", "milton flask"],
  "Cello": ["cello opalware", "cello dinner set"],
  "Tupperware": ["tupperware india", "tupperware bottles"],
  "Wakefit": ["wakefit mattress", "wakefit pillow", "wakefit bedsheets"],
  "Sleepwell": ["sleepwell mattress"],
  "Duroflex": ["duroflex mattress"],
  "Nilkamal": ["nilkamal furniture", "nilkamal chairs"],
  "Urban Ladder": ["urban ladder furniture"],
  "Pepperfry": ["pepperfry furniture"],
  "IKEA": ["ikea india", "ikea bangalore"],
  "Bombay Dyeing": ["bombay dyeing bedsheets", "bombay dyeing curtains"],
  "Trident": ["trident group", "trident towels", "trident bedsheets"],
  "FabIndia": ["fab india", "fabindia"],
  "Tanishq": ["tanishq jewellery", "tanishq gold"],
  "Kalyan Jewellers": ["kalyan"],
  "Malabar Gold": ["malabar gold and diamonds"],
  "CaratLane": ["carat lane"],
  "BlueStone": ["bluestone jewellery"],
  "GIVA": ["giva jewellery"],
  "Lenskart": ["lenskart glasses", "lenskart eyewear"],
  "Ray-Ban": ["rayban", "ray ban sunglasses"],
  "Fossil": ["fossil watch", "fossil india"],
  "Casio": ["casio gshock", "g-shock", "gshock", "casio edifice", "casio keyboard", "casio calculator"],
  "Timex": ["timex india"],
  "Daniel Wellington": ["dw watch", "daniel wellington watch"],
  "Jockey": ["jockey india", "jockey underwear"],
  "US Polo": ["u.s. polo assn", "us polo assn", "uspa", "u.s. polo"],
  "Allen Solly": ["allen solly"],
  "Van Heusen": ["van husen"],
  "Peter England": ["peter england india"],
  "Louis Philippe": ["louis philippe"],
  "Jack & Jones": ["jack and jones"],
  "Tommy Hilfiger": ["tommy", "tommy hilfiger india"],
  "Calvin Klein": ["ck", "calvin klein india"],
  "Woodland": ["woodland shoes", "woodland india"],
  "Bata": ["bata shoes", "bata india"],
  "Skechers": ["skechers shoes", "skechers india"],
  "Crocs": ["crocs shoes", "crocs india"],
  "Under Armour": ["under armour india"],
  "Asics": ["asics india"],
  "New Balance": ["new balance india"],
  "Hush Puppies": ["hush puppies india"],
  "Metro": ["metro shoes", "metro india"],
  "Red Tape": ["redtape", "red tape shoes"],
  "Liberty": ["liberty shoes"],
  "Campus": ["campus shoes", "campus footwear"],
  "Sparx": ["sparx shoes"],
  "Killer": ["killer jeans"],
  "Wrangler": ["wrangler jeans"],
  "Lee": ["lee jeans", "lee india"],
  "Pepe Jeans": ["pepe jeans india"],
  "Spykar": ["spykar jeans"],
  "Flying Machine": ["flying machine jeans"],
  "Mufti": ["mufti jeans", "mufti shirt"],
  "Roadster": ["roadster fashion", "roadster clothing"],
  "HRX": ["hrx by hrithik", "hrx fitness"],
  "Snitch": ["snitch fashion"],
  "The Souled Store": ["souled store"],
  "Bewakoof": ["bewakoof.com"],
  "Highlander": ["highlander fashion"],
  "Wrogn": ["wrogn fashion"],
  "Park Avenue": ["park avenue men"],
  "Blackberrys": ["blackberry fashion"],
  "Dennis Lingo": ["dennis lingo shirt"],
  "Campus Sutra": ["campus sutra"],
  "XYXX": ["xyxx crew"],
  "Rupa": ["rupa briefs", "rupa innerwear", "rupa publications"],
  "Dollar": ["dollar innerwear"],
  "Lux Cozi": ["lux cozi innerwear"],
  "Hanes": ["hanes india"],
  "Vero Moda": ["vero moda india"],
  "ONLY": ["only fashion"],
  "AND": ["and fashion", "and brand"],
  "H&M": ["hm", "h and m", "h&m india"],
  "Zara": ["zara india"],
  "Forever 21": ["forever21"],
  "Marks & Spencer": ["marks and spencer", "m&s"],
  "Biba": ["biba fashion", "biba ethnic"],
  "Libas": ["libas fashion"],
  "Global Desi": ["global desi fashion"],
  "Soch": ["soch fashion"],
  "W": ["w fashion", "w brand"],
  "Enamor": ["enamor innerwear"],
  "Clovia": ["clovia innerwear"],
  "Zivame": ["zivame innerwear"],
  "Triumph": ["triumph underwear"],
  "Lavie": ["lavie bags"],
  "Baggit": ["baggit handbags"],
  "Caprese": ["caprese bags"],
  "Hidesign": ["hidesign leather"],
  "Zouk": ["zouk bags"],
  "Sugar": ["sugar cosmetics", "sugar makeup"],
  "Colorbar": ["colorbar cosmetics"],
  "Faces Canada": ["faces canada"],
  "MyGlamm": ["my glamm"],
  "Forest Essentials": ["forest essentials luxury"],
  "Kama Ayurveda": ["kama ayurveda luxury"],
  "The Body Shop": ["body shop"],
  "Innisfree": ["innisfree india"],
  "Kiehl's": ["kiehls"],
  "Charlotte Tilbury": ["charlotte tilbury india"],
  "Huda Beauty": ["huda beauty india"],
  "Estee Lauder": ["estee lauder india"],
  "Clinique": ["clinique india"],
  "MAC": ["mac cosmetics", "mac makeup"],
  "Bobbi Brown": ["bobi brown"],
  "Dot & Key": ["dot and key", "dot n key"],
  "Minimalist": ["minimalist skincare"],
  "The Derma Co": ["derma co", "the derma co"],
  "Plum": ["plum goodness"],
  "mCaffeine": ["m caffeine"],
  "Cetaphil": ["cetaphil india"],
  "Neutrogena": ["neutrogena india"],
  "Dove": ["dove india", "dove soap"],
  "Beardo": ["beardo india"],
  "Ustraa": ["ustraa grooming"],
  "Bombay Shaving Company": ["bombay shaving"],
  "Gillette": ["gillette india", "gillette mach3"],
  "Patanjali": ["patanjali ayurved", "baba ramdev"],
  "Dabur": ["dabur india", "dabur chyawanprash"],
  "Himalaya": ["himalaya wellness", "himalaya herbals", "himalaya baby"],
  "Biotique": ["biotique ayurvedic"],
  "WOW Skin Science": ["wow skin", "wow science"],
  "Bella Vita": ["bella vita organic"],
  "Aqualogica": ["aqualogica skincare"],
  "Foxtale": ["foxtale skincare"],
  "Pilgrim": ["pilgrim skincare"],
  "Vaseline": ["vaseline india"],
  "Veet": ["veet hair removal"],
  "Whisper": ["whisper pads", "whisper india"],
  "Stayfree": ["stayfree pads"],
  "Durex": ["durex india"],
  "Volini": ["volini pain relief"],
  "Moov": ["moov pain relief"],
  "Revital": ["revital h"],
  "Ensure": ["ensure nutrition"],
  "Horlicks": ["horlicks india", "horlicks women"],
  "Complan": ["complan drink"],
  "Boost": ["boost energy", "boost drink"],
  "Bournvita": ["bournvita chocolate"],
  "Crocin": ["crocin pain"],
  "Dolo": ["dolo 650"],
  "Vicks": ["vicks vaporub"],
  "ENO": ["eno antacid"],
  "Combiflam": ["combiflam pain"],
  "Zandu": ["zandu balm"],
  "Cipla": ["cipla pharma"],
  "Sun Pharma": ["sun pharmaceuticals"],
  "Mankind": ["mankind pharma"],
  "Pampers": ["pampers india"],
  "MamyPoko": ["mamy poko"],
  "Huggies": ["huggies india"],
  "Johnson's Baby": ["johnson baby", "johnsons baby"],
  "Sebamed": ["sebamed india"],
  "Chicco": ["chicco india"],
  "Mee Mee": ["mee mee baby"],
  "LuvLap": ["luvlap stroller"],
  "Mother Sparsh": ["mother sparsh baby"],
  "The Moms Co": ["moms co"],
  "R for Rabbit": ["r rabbit baby"],
  "Philips Avent": ["philips avent baby"],
  "LEGO": ["lego india", "lego sets"],
  "Hot Wheels": ["hot wheels india"],
  "Barbie": ["barbie doll"],
  "Funskool": ["funskool india"],
  "Hasbro": ["hasbro india"],
  "Mattel": ["mattel india"],
  "Nerf": ["nerf gun"],
  "Fisher-Price": ["fisher price"],
  "Skillmatics": ["skillmatics india"],
  "Preethi": ["preethi mixer", "preethi kitchen appliances"],
  "Sujata": ["sujata mixer"],
  "Atomberg": ["atomberg technologies"],
  "Crompton": ["crompton fan", "crompton motor", "crompton Greaves"],
  "Orient": ["orient electric", "orient fan"],
  "Usha": ["usha fan", "usha sewing"],
  "Syska": ["syska led", "syska fan"],
  "Eveready": ["eveready battery"],
  "Duracell": ["duracell battery"],
  "Exide": ["exide battery", "exide inverter"],
  "Amaron": ["amaron battery"],
  "Luminous": ["luminous inverter", "luminous battery"],
  "V-Guard": ["v guard stabilizer"],
  "Honeywell": ["honeywell india"],
  "Symphony": ["symphony cooler"],
  "Voltas": ["voltas ac", "voltas cooler"],
  "Blue Star": ["blue star ac"],
  "Daikin": ["daikin ac"],
  "Hitachi": ["hitachi ac"],
  "Carrier": ["carrier ac"],
  "Lloyd": ["lloyd ac", "lloyd washing machine"],
  "IFB": ["ifb washing machine", "ifb ac"],
  "Haier": ["haier ac", "haier fridge"],
  "TCL": ["tcl tv", "tcl ac"],
  "Hisense": ["hisense tv"],
  "Vu": ["vu tv"],
  "Kodak": ["kodak tv"],
  "Thomson": ["thomson tv"],
  "Blaupunkt": ["blaupunkt tv", "blaupunkt soundbar"],
  "iFFALCON": ["ifflalcon tv"],
  "Onida": ["onida washing machine"],
  "Liebherr": ["liebherr fridge"],
  "Voltas Beko": ["voltas beko fridge"],
  "Wonderchef": ["wonderchef kitchen"],
  "Morphy Richards": ["morphy richards"],
  "Kent": ["kent water purifier", "kent ro"],
  "Eureka Forbes": ["eureka forbes", "aquaguard", "aquaguard water purifier"],
  "Faber": ["faber chimney", "faber hood"],
  "Elica": ["elica chimney"],
  "Kaff": ["kaff chimney"],
  "Maharaja Whiteline": ["maharaja whiteline", "maharaja"],
  "Inalsa": ["inalsa kitchen"],
  "Agaro": ["agaro kitchen"],
  "iBELL": ["ibell kitchen"],
  "Treo": ["treo kitchen"],
  "Bergner": ["bergner kitchen", "bergner cookware"],
  "La Opala": ["la opala dinnerware", "la opala"],
  "Corelle": ["corelle dinnerware", "corelle plates"],
  "Ellementry": ["ellementry kitchen", "ellementry decor"],
  "Signoraware": ["signoraware containers", "signoraware"],
  "Solimo": ["solimo amazon", "solimo bedsheets"],
  "Amazon Basics": ["amazonbasics", "amazon basic"],
  "Kuber Industries": ["kuber storage"],
  "Featherlite": ["featherlite furniture"],
  "The Sleep Company": ["sleep company mattress", "sleep company pillow"],
  "Kurlon": ["kurlon mattress", "kurlon foam"],
  "Home Centre": ["home centre india", "home centre furniture"],
  "Spaces": ["spaces welspun", "spaces bedsheets"],
  "Portico": ["portico india", "portico bedsheets"],
  "Raymond Home": ["raymond home", "raymond bedsheets"],
  "Story@Home": ["story at home", "story home bedsheets"],
  "D'Decor": ["d decor", "d decor curtains"],
  "Swayam": ["swayam fashion", "swayam bedsheets"],
  "Divine Casa": ["divine casa", "divine casa bedsheets"],
  "Trance Home Linen": ["trance home", "trance bedsheets"],
  "Chumbak": ["chumbak decor", "chumbak home decor"],
  "Homesake": ["homesake decor", "homesake lamps"],
  "Hosley": ["hosley decor", "hosley candles"],
  "ExclusiveLane": ["exclusive lane", "exclusive lane decor"],
  "TIED RIBBONS": ["tied ribbons", "tied ribbons decor"],
  "Webelkart": ["webelkart", "webelkart decor"],
  "@home by Nilkamal": ["at home nilkamal"],
  "Ugaoo": ["ugaoo garden", "u goo plants"],
  "TrustBasket": ["trust basket", "trust basket soil"],
  "Sharpex": ["sharpex garden", "sharpex pruners"],
  "Kraft Seeds": ["kraft seeds garden", "kraft seeds plants"],
  "Green Paradise": ["green paradise garden", "green paradise plants"],
  "Utkarsh": ["utkarsh seeds"],
  "Pedigree": ["pedigree dog food"],
  "Drools": ["drools pet food"],
  "Royal Canin": ["royal canin dog food"],
  "Whiskas": ["whiskas cat food"],
  "Farmina N&D": ["farmina"],
  "Purepet": ["purepet pet food"],
  "Meat Up": ["meat up pet food"],
  "Sheba": ["sheba cat food"],
  "Me-O": ["me o cat food"],
  "Wiggles": ["wiggles pet"],
  "Heads Up For Tails": ["heads up tails"],
  "Goofy Tails": ["goofy tails pet"],
  "Captain Zack": ["captain zack pet"],
  "SG": ["sg cricket"],
  "SS": ["ss cricket", "sareen sports"],
  "Kookaburra": ["kookaburra cricket"],
  "MRF": ["mrf cricket bat", "mrf tyres"],
  "GM": ["gm cricket", "gunn moore"],
  "Spartan": ["spartan cricket"],
  "DSC": ["dsc cricket"],
  "BAS": ["bas cricket"],
  "Cosco": ["cosco cricket", "cosco ball"],
  "Nivia": ["nivia football", "nivia cricket"],
  "Yonex": ["yonex badminton"],
  "Li-Ning": ["li ning badminton"],
  "Apacs": ["apacs badminton"],
  "Victor": ["victor badminton"],
  "Carlton": ["carlton badminton"],
  "Head": ["head tennis", "head badminton"],
  "Babolat": ["babolat tennis"],
  "FZ Forza": ["fz forza"],
  "Hero": ["hero cycles", "hero bicycles"],
  "Btwin": ["btwin cycles", "decathlon cycles"],
  "Firefox": ["firefox cycles"],
  "Hercules": ["hercules cycles"],
  "Montra": ["montra cycles"],
  "Trek": ["trek bicycles"],
  "Giant": ["giant bicycles"],
  "Vector X": ["vector x football"],
  "Kipsta": ["kipsta football", "decathlon football"],
  "Vicky": ["vicky football"],
  "BoldFit": ["boldfit fitness"],
  "Cockatoo": ["cockatoo fitness"],
  "Kore": ["kore fitness"],
  "Aurion": ["aurion fitness"],
  "Strauss": ["strauss fitness"],
  "Fitkit": ["fitkit fitness"],
  "Lifelong": ["lifelong fitness"],
  "De Jure Fitness": ["de jure fitness"],
  "PowerMax": ["powermax fitness"],
  "Kobo": ["kobo fitness"],
  "Durafit": ["durafit fitness"],
  "Cultsport": ["cult sport", "cult.fit"],
  "Healthgenie": ["health genie fitness"],
  "Sparnod": ["sparnod fitness"],
  "RPM Fitness": ["rpm fitness"],
  "Half Moon": ["half moon bags"],
  "Fur Jaden": ["fur jaden bags"],
  "Mokobara": ["mokobara luggage"],
  "Uppercase": ["uppercase bags"],
  "Assembly": ["assembly luggage"],
  "Nasher Miles": ["nasher miles luggage"],
  "Kamiliant": ["kamiliant luggage"],
  "Urban Jack": ["urban jack luggage"],
  "Zoomlite": ["zoomlite travel"],
  "Storite": ["storite bags"],
  "Navpackngo": ["navpackngo travel"],
  "Studds": ["studds helmet"],
  "Steelbird": ["steelbird helmet"],
  "Vega": ["vega helmet"],
  "LS2": ["ls2 helmet"],
  "SMK": ["smk helmet"],
  "Axor": ["axor helmet"],
  "MT Helmets": ["mt helmets"],
  "Royal Enfield": ["royal enfield bike", "bullet", "continental gt", "royal enfield accessories"],
  "Autofy": ["autofy accessories"],
  "CEAT": ["ceat tyres"],
  "Apollo": ["apollo tyres", "apollo hospitals"],
  "JK Tyre": ["jk tyres"],
  "Bridgestone": ["bridgestone tyres"],
  "NGK": ["ngk spark plug"],
  "Mann Filter": ["mann filter"],
  "Gabriel": ["gabriel shock"],
  "Denso": ["denso parts"],
  "Motul": ["motul oil", "motul engine oil"],
  "Turtle Wax": ["turtle wax polish"],
  "Chemical Guys": ["chemical guys"],
  "Armor All": ["armor all"],
  "Wurth": ["wurth india"],
  "Abro": ["abro products", "abro car care"],
  "Fluke": ["fluke multimeter"],
  "Mitutoyo": ["mitutoyo measuring"],
  "Taparia": ["taparia tools"],
  "Stanley": ["stanley tools", "stanley india"],
  "Cheston": ["cheston tools"],
  "Karam": ["karam safety"],
  "Scotch-Brite": ["scotch brite"],
  "Gala": ["gala cleaning"],
  "Diversey": ["diversey taski"],
  "Karcher": ["karcher pressure washer", "karcher india"],
  "Roots": ["roots mulch"],
  "Penguin Random House": ["penguin books"],
  "HarperCollins": ["harper collins"],
  "Westland": ["westland books"],
  "Bloomsbury": ["bloomsbury india"],
  "Hachette": ["hachette india"],
  "Pan Macmillan": ["pan macmillan india"],
  "Manjul": ["manjul publishing"],
  "Juggernaut": ["juggernaut books"],
  "Simon & Schuster": ["simon schuster"],
  "Scholastic": ["scholastic india"],
  "Penguin": ["penguin india"],
  "DK": ["dk books"],
  "Amar Chitra Katha": ["amar chitra katha", "ack"],
  "Tulika": ["tulika books"],
  "Pratham": ["pratham books"],
  "Usborne": ["usborne books"],
  "Wonder House": ["wonder house books"],
  "NCERT": ["ncert books"],
  "S. Chand": ["s chand"],
  "Arihant": ["arihant books"],
  "Oswaal": ["oswaal books"],
  "Wiley": ["wiley india"],
  "Pearson": ["pearson india"],
  "McGraw Hill": ["mcgraw hill"],
  "Oxford University Press": ["oup india", "oxford press"],
  "MTG": ["mtg books"],
  "Disha": ["disha publications"],
  "EA": ["ea sports", "electronic arts"],
  "Ubisoft": ["ubisoft india"],
  "Rockstar Games": ["rockstar", "gta"],
  "Activision": ["activision blizzard"],
  "Capcom": ["capcom india"],
  "Bethesda": ["bethesda softworks"],
  "Square Enix": ["square enix india"],
  "T-Series": ["t series", "tseries"],
  "Saregama": ["saregama carvaan"],
  "Sony Music": ["sony music india"],
  "Zee Music": ["zee music company"],
  "Universal Music": ["universal music india"],
  "Times Music": ["times music india"],
  "YRF Music": ["yash raj music"],
  "Tips": ["tips industries"],
  "Kreo": ["kreo gaming"],
  "HyperX": ["hyperx gaming"],
  "SteelSeries": ["steelseries gaming"],
  "Redragon": ["redragon gaming"],
  "Logitech G": ["logitech gaming"],
  "Realme": ["real me"],
  "Vivo": ["vivo india"],
  "Oppo": ["oppo india"],
  "iQOO": ["iqoo"],
  "Infinix": ["infinix phones"],
  "Tecno": ["tecno phones"],
  "itel": ["itel phones"],
  "Lava": ["lava phones"],
  "Honor": ["honor phones"],
  "CMF by Nothing": ["cmf nothing", "cmf phone"],
  "POCO": ["poco phone"],
  "Redmi": ["redmi phone"],
  "Google Pixel": ["google pixel phone", "pixel phone"],
  "Apple iPad": ["ipad", "ipad pro", "ipad air"],
  "Xiaomi Redmi": ["xiaomi redmi", "redmi phone"],
  "Amazfit": ["amazfit watch"],
  "Garmin": ["garmin watch", "garmin india"],
  "Fitbit": ["fitbit watch"],
  "Fire-Boltt": ["fire boltt"],
  "beatXP": ["beat xp"],
  "Pebble": ["pebble watch"],
  "Amazon Echo": ["echo dot", "echo show", "alexa", "echo"],
  "Google Nest": ["nest hub", "nest mini", "google home"],
  "Philips Hue": ["hue lights", "hue bulb"],
  "TP-Link": ["tp link", "tplink"],
  "Tapo": ["tapo camera", "tapo smart"],
  "Kasa": ["kasa smart"],
  "D-Link": ["dlink", "d link"],
  "Netgear": ["netgear router"],
  "Tenda": ["tenda router"],
  "Mercusys": ["mercusys router"],
  "Cisco": ["cisco networking"],
  "Digisol": ["digisol router"],
  "Jio": ["jio fiber", "jio airfiber"],
  "Logitech": ["logitech mouse", "logitech keyboard"],
  "Redgear": ["redgear gaming"],
  "Cosmic Byte": ["cosmic byte gaming"],
  "Ant Esports": ["ant esports gaming"],
  "Razer": ["razer gaming", "razer mouse"],
  "Corsair": ["corsair gaming", "corsair ram"],
  "Rapoo": ["rapoo keyboard"],
  "Lapcare": ["lapcare accessories"],
  "Dragon War": ["dragon war gaming"],
  "BenQ": ["benq monitor"],
  "ViewSonic": ["viewsonic monitor"],
  "AOC": ["aoc monitor"],
  "Frontech": ["frontech monitor"],
  "Gigabyte": ["gigabyte motherboard", "gigabyte gpu"],
  "ASRock": ["asrock motherboard"],
  "Zotac": ["zotac gpu"],
  "Antec": ["antec case"],
  "Deepcool": ["deepcool cooler"],
  "G.Skill": ["g skill ram"],
  "Cooler Master": ["coolermaster", "cooler master case"],
  "Crucial": ["crucial ram", "crucial ssd"],
  "Kingston": ["kingston ram", "kingston ssd"],
  "WD": ["western digital", "wd ssd", "wd hard disk"],
  "Seagate": ["seagate hard disk", "seagate ssd"],
  "SanDisk": ["sandisk ssd", "sandisk card"],
  "Toshiba": ["toshiba hard disk"],
  "Lexar": ["lexar memory card"],
  "Transcend": ["transcend ssd"],
  "ADATA": ["adata ssd"],
  "PNY": ["pny ssd"],
  "Canon": ["canon camera", "canon printer"],
  "Nikon": ["nikon camera"],
  "Fujifilm": ["fuji film", "fuji camera"],
  "GoPro": ["gopro camera", "gopro hero"],
  "DJI": ["dji drone", "dji camera"],
  "Insta360": ["insta 360"],
  "Leica": ["leica camera"],
  "OM System": ["olympus camera", "om system"],
  "Pentax": ["pentax camera"],
  "CP Plus": ["cp plus camera"],
  "Hikvision": ["hikvision camera"],
  "Qubo": ["qubo camera"],
  "Imou": ["imou camera"],
  "Ezviz": ["ezviz camera"],
  "Dahua": ["dahua camera"],
  "Digitek": ["digitek tripod"],
  "Manfrotto": ["manfrotto tripod"],
  "Godox": ["godox flash"],
  "Simpex": ["simpex tripod"],
  "Benro": ["benro tripod"],
  "JJC": ["jjc camera"],
  "Rode": ["rode mic", "rode microphone"],
  "Boya": ["boya mic", "boya microphone"],
  "Yamaha": ["yamaha keyboard", "yamaha guitar"],
  "Fender": ["fender guitar"],
  "Ibanez": ["ibanez guitar"],
  "Roland": ["roland keyboard", "roland drums"],
  "Kadence": ["kadence guitar"],
  "Juarez": ["juarez guitar"],
  "Henrix": ["henrix guitar"],
  "Zoom": ["zoom recorder"],
  "Shure": ["shure mic"],
  "Behringer": ["behringer mixer"],
  "AKG": ["akg headphones"],
  "Audio-Technica": ["audio technica", "at headphones"],
  "Cort": ["cort guitar"],
  "Intern": ["intern guitar"],
  "Sony PlayStation": ["ps5", "ps4", "playstation 5", "playstation 4"],
  "Microsoft Xbox": ["xbox series x", "xbox series s", "xbox one"],
  "Nintendo": ["nintendo switch", "switch"],
  "Valve Steam Deck": ["steam deck"],
  "Asus ROG Ally": ["rog ally"],
  "Vinod": ["vinod cookware"],
  "Steelo": ["steel containers"],
  "Nayasa": ["nayasa bottles"],
  "Pearlpet": ["pearlpet containers"],
  "Princeware": ["princeware bottles"],
  "All Time": ["all time containers"],
  "Nakshatra": ["nakshatra containers"],
  "Trueware": ["trueware bottles"],
  "Sleepycat": ["sleepycat mattress"],
  "Gardening Mart": ["gardening mart"],
  "Amazon Commercial": ["amazon commercial"],
  "Labpro": ["labpro scientific"],
  "Rossari": ["rossari chemicals"],
  "Himedia": ["himedia labs"],
  "Eisco": ["eisco scientific"],
  "HTC": ["htc instruments"],
  "Meco": ["meco multimeter"],
  "Mextech": ["mextech meter"],
  "Uni-T": ["uni t meter"],
  "Insize": ["insize measuring"],
  "Pumpkin": ["pumpkin car electronics", "pumpkin android"],
  "70mai": ["70 mai dashcam", "70mai dash cam"],
  "GoMechanic": ["go mechanic"],
  "Woscher": ["woscher car care"],
  "Oshotto": ["oshotto accessories"],
  "Kingsway": ["kingsway car"],
  "AllExtreme": ["all extreme car"],
  "Formula 1": ["f1 car wax"],
  "Wavex": ["wavex car care"],
  "Michelin": ["michelin tyres"],
  "Pioneer": ["pioneer car stereo"],
  "Kenwood": ["kenwood car stereo"],
  "Alpine": ["alpine car audio"],
}

function parseCSV(csvContent: string): { category: string; subCategory: string; brand: string }[] {
  const rows: { category: string; subCategory: string; brand: string }[] = []
  const lines = csvContent.trim().split('\n')

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const ch = line[j]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    fields.push(current.trim())

    if (fields.length >= 3) {
      rows.push({
        category: fields[0],
        subCategory: fields[1],
        brand: fields[2],
      })
    }
  }

  return rows
}

function extractParentBrand(brandName: string): { canonical: string; parent?: string } {
  const parenMatch = brandName.match(/^(.+?)\s*\((.+?)\)\s*$/)
  if (parenMatch) {
    return { canonical: parenMatch[2].trim(), parent: parenMatch[1].trim() }
  }
  return { canonical: brandName }
}

function generateAliases(canonical: string, parent?: string): string[] {
  const aliases = new Set<string>()
  const lower = canonical.toLowerCase()
  aliases.add(lower)

  if (parent) {
    aliases.add(parent.toLowerCase())
  }

  if (MANUAL_ALIASES[canonical]) {
    for (const alias of MANUAL_ALIASES[canonical]) {
      aliases.add(alias.toLowerCase())
    }
  }

  if (MANUAL_ALIASES[parent || '']) {
    for (const alias of MANUAL_ALIASES[parent || '']) {
      aliases.add(alias.toLowerCase())
    }
  }

  if (canonical.includes(' ')) {
    aliases.add(canonical.replace(/\s+/g, '').toLowerCase())
    const words = canonical.split(/\s+/)
    if (words.length === 2) {
      aliases.add(words.join(' ').toLowerCase())
    }
  }

  if (canonical.includes('/') || canonical.includes('&')) {
    const simplified = canonical.replace(/[\/&]/g, '').replace(/\s+/g, ' ').trim()
    aliases.add(simplified.toLowerCase())
  }

  if (canonical.includes("'")) {
    aliases.add(canonical.replace(/'/g, '').toLowerCase())
  }

  if (canonical.includes('.')) {
    aliases.add(canonical.replace(/\./g, '').toLowerCase())
  }

  if (canonical.includes('-')) {
    aliases.add(canonical.replace(/-/g, ' ').toLowerCase())
    aliases.add(canonical.replace(/-/g, '').toLowerCase())
  }

  if (canonical === 'boAt') {
    aliases.add('boat')
    aliases.add('bo at')
  }

  if (canonical === 'realme') {
    aliases.add('real me')
  }

  if (canonical === 'iQOO') {
    aliases.add('iqoo')
    aliases.add('i qoo')
  }

  if (canonical === 'OPPO') {
    aliases.add('oppo')
  }

  if (canonical === 'vivo') {
    aliases.add('vivo')
  }

  return Array.from(aliases)
}

let _gazetteer: Gazetteer | null = null

export function loadGazetteer(csvPath?: string): Gazetteer {
  if (_gazetteer) return _gazetteer

  let csvContent: string
  if (csvPath) {
    csvContent = readFileSync(csvPath, 'utf-8')
  } else {
    // Bundled at build time — see brand-master.ts for why this is not an fs read.
    const sortedBrands = BRAND_MASTER as BrandEntry[]
    if (sortedBrands.length === 0) {
      throw new Error('Brand master is empty. Rebuild it with: npm run build:gazetteer')
    }

    _gazetteer = {
      brands: sortedBrands,
      byCanonical: new Map(sortedBrands.map(b => [b.canonical.toLowerCase(), b])),
      byAlias: new Map(),
      categories: new Map(),
      allSearchTerms: [],
    }
    for (const brand of _gazetteer.brands) {
      for (const alias of brand.aliases) {
        if (!_gazetteer.byAlias.has(alias)) {
          _gazetteer.byAlias.set(alias, brand)
        }
      }
      const existing = _gazetteer.categories.get(brand.category) || []
      existing.push(brand)
      _gazetteer.categories.set(brand.category, existing)
    }
    _gazetteer.allSearchTerms = Array.from(_gazetteer.byAlias.keys())
    return _gazetteer
  }

  const rows = parseCSV(csvContent)
  const brands: BrandEntry[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const { canonical, parent } = extractParentBrand(row.brand)
    const key = `${canonical}|${row.category}|${row.subCategory}`
    if (seen.has(key)) continue
    seen.add(key)

    brands.push({
      canonical,
      aliases: generateAliases(canonical, parent),
      category: row.category,
      subCategory: row.subCategory,
      parentBrand: parent,
    })
  }

  _gazetteer = {
    brands,
    byCanonical: new Map(brands.map(b => [b.canonical.toLowerCase(), b])),
    byAlias: new Map(),
    categories: new Map(),
    allSearchTerms: [],
  }

  // Sort brands: canonical brands (no parentBrand) first, then sub-brands
  // This ensures canonical brands claim aliases before sub-brands
  const sortedBrands = [...brands].sort((a, b) => {
    if (!a.parentBrand && b.parentBrand) return -1
    if (a.parentBrand && !b.parentBrand) return 1
    return 0
  })

  for (const brand of sortedBrands) {
    for (const alias of brand.aliases) {
      if (!_gazetteer.byAlias.has(alias)) {
        _gazetteer.byAlias.set(alias, brand)
      }
    }
    const existing = _gazetteer.categories.get(brand.category) || []
    existing.push(brand)
    _gazetteer.categories.set(brand.category, existing)
  }

  _gazetteer.allSearchTerms = Array.from(_gazetteer.byAlias.keys())

  return _gazetteer
}

export function getBrandsForWhisper(categories?: string[]): string[] {
  const gazetteer = loadGazetteer()
  const brandNames: string[] = []

  if (categories && categories.length > 0) {
    for (const cat of categories) {
      const brands = gazetteer.categories.get(cat) || []
      brandNames.push(...brands.map(b => b.canonical))
    }
  } else {
    const topBrands = new Set<string>()
    for (const brand of gazetteer.brands) {
      if (topBrands.size >= 80) break
      topBrands.add(brand.canonical)
    }
    brandNames.push(...topBrands)
  }

  return [...new Set(brandNames)].slice(0, 80)
}

export function resetGazetteer(): void {
  _gazetteer = null
}
