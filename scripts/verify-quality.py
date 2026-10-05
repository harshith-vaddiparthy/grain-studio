import argparse
import io
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

PARSER = argparse.ArgumentParser()
PARSER.add_argument('--url', default='http://127.0.0.1:4187')
PARSER.add_argument('--output', default='output/quality')
args = PARSER.parse_args()
ROOT = Path(args.output); ROOT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(label, condition, details=None):
    checks.append({'label':label,'passed':bool(condition),'details':details})
    print(('PASS ' if condition else 'FAIL ')+label,flush=True)

with sync_playwright() as pw:
    browser=pw.chromium.launch()
    context=browser.new_context(accept_downloads=True)
    context.add_init_script("localStorage.setItem('grain-studio-analytics-optout','1')")
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
    for width in [1440,1180,1036,820,768,390,360,320]:
        page.set_viewport_size({'width':width,'height':900 if width>820 else 844})
        page.goto(args.url,wait_until='load');page.wait_for_selector('.status-ready',timeout=20000)
        creator=page.locator('.creator-link')
        check(f'full creator credit visible at {width}px',creator.is_visible() and creator.inner_text()=='By Harshith Vaddiparthy')
        credit=creator.bounding_box();check(f'creator credit is not clipped at {width}px',bool(credit and credit['x']>=0 and credit['x']+credit['width']<=width+1),credit)
        check(f'no horizontal overflow at {width}px',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        action=page.locator('.stage-image-actions').get_by_role('button',name='Replace image')
        check(f'image replacement available at {width}px',action.is_visible())
        compare=page.locator('.stage-image-actions').get_by_role('button',name='Compare',exact=True)
        check(f'touch comparison available at {width}px',compare.is_visible() and compare.is_enabled())
        if width<=820:
            b=action.bounding_box();check(f'touch action height at {width}px',bool(b and b['height']>=44),b)
            check(f'dock stays in flow at {width}px',page.locator('.texture-dock').evaluate("e=>getComputedStyle(e).position")=='static')
            compare.click();check(f'comparison responds at {width}px',page.locator('.compare-input').count()==1);compare.click()
        if width in [1440,390]:page.screenshot(path=str(ROOT/f'editor-{width}.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1000})
    page.goto(args.url+'/?r=1.film-grain.65.60.50.8.source.17',wait_until='load')
    page.wait_for_selector('.status-ready',timeout=20000)
    check('new film-grain recipe selects Silver Grain',page.locator('.inspector h1').inner_text()=='Silver Grain')
    check('grain has meaningful control labels',page.locator('label[for=intensity]').inner_text()=='Amount' and page.locator('label[for=scale]').inner_text()=='Grain size')
    check('grain cannot apply a misleading palette',page.locator('.palette-fieldset').count()==0)
    image=Image.new('RGBA',(640,480),(0,0,0,0))
    for y in range(80,400):
        for x in range(100,540): image.putpixel((x,y),(90,140,170,128 if x<320 else 255))
    buf=io.BytesIO();image.save(buf,format='PNG')
    page.locator('input[type=file]').set_input_files({'name':'transparent-fixture.png','mimeType':'image/png','buffer':buf.getvalue()})
    page.wait_for_function("!document.querySelector('.sample-badge') && document.querySelector('.status-ready')")
    page.screenshot(path=str(ROOT/'grain-transparent-editor.png'),full_page=True)
    preview=page.locator('.canvas-wrap > canvas').evaluate("c=>{let d=c.getContext('2d').getImageData(0,0,c.width,c.height);return {width:c.width,height:c.height,corner:d.data[3],centre:d.data[(240*c.width+200)*4+3]}}")
    check('preview preserves transparent and half-transparent source alpha',preview['corner']==0 and preview['centre']==128,preview)
    for format,name in [('PNG','png'),('WEBP','webp'),('JPEG','jpeg')]:
        page.get_by_role('button',name='Export',exact=True).click()
        dialog=page.get_by_role('dialog')
        dialog.get_by_role('button',name=format,exact=True).click()
        with page.expect_download(timeout=60000) as download_info:
            dialog.get_by_role('button',name='Download',exact=True).click()
        download=download_info.value
        dest=ROOT/f'transparent-grain.{"jpg" if name=="jpeg" else name}'
        download.save_as(dest)
        with Image.open(dest) as decoded:
            decoded.load()
            check(f'{format} export is an actual decoded image',decoded.size==(640,480),{'pixels':decoded.size,'mode':decoded.mode,'bytes':dest.stat().st_size})
            if name=='jpeg':
                check('JPEG flattens transparent corners onto white',min(decoded.convert('RGB').getpixel((0,0)))>245)
            else:
                alpha=decoded.convert('RGBA').getchannel('A')
                check(f'{format} keeps source alpha',alpha.getpixel((0,0))==0 and abs(alpha.getpixel((200,240))-128)<=1)
    check('browser errors absent',not errors,errors)
    context.close();browser.close()
result={'url':args.url,'checks':checks,'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'browser_errors':errors,'scope':'Chromium viewport emulation and real local downloads; not a physical phone test'}
(ROOT/'browser-quality-result.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'passed':result['passed'],'failed':result['failed'],'output':str(ROOT)}),flush=True)
if result['failed']:raise SystemExit(1)
