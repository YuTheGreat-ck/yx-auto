// Cloudflare Worker - 修复优化版
// 增加了 Hysteria2 支持，补全了 UI 界面

let scu = 'https://url.v1.mk/sub'; // 订阅转换地址
let customDNS = 'https://dns.google/dns-query';
let customECHDomain = 'cloudflare-ech.com';
const defaultIPURL = 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';

// --- 核心逻辑开始 ---

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(p => p);

        // 首页渲染
        if (url.pathname === '/' || pathParts.length === 0) {
            return new Response(generateHomePage(url.hostname), {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // 订阅接口: /{UUID}/sub
        if (pathParts.length >= 2 && pathParts[1] === 'sub') {
            const uuid = pathParts[0];
            if (!isValidUUID(uuid)) return new Response('UUID 格式错误', { status: 400 });

            const domain = url.searchParams.get('domain') || url.hostname;
            const piu = url.searchParams.get('piu') || defaultIPURL;
            
            // 协议开关
            const evEnabled = url.searchParams.get('vl') !== 'no';
            const etEnabled = url.searchParams.get('tr') === 'yes';
            const vmEnabled = url.searchParams.get('mess') === 'yes';
            const hy2Enabled = url.searchParams.get('hy2') === 'yes';

            // 网络/运营商筛选
            const ipv4 = url.searchParams.get('ipv4') !== 'no';
            const ipv6 = url.searchParams.get('ipv6') !== 'no';
            const ispMobile = url.searchParams.get('ispMobile') !== 'no';
            const ispUnicom = url.searchParams.get('ispUnicom') !== 'no';
            const ispTelecom = url.searchParams.get('ispTelecom') !== 'no';

            let disableNonTLS = url.searchParams.get('dkby') === 'yes';
            const echEnabled = url.searchParams.get('ech') === 'yes';
            const echConfig = echEnabled ? `${customECHDomain}+${customDNS}` : null;
            if (echEnabled) disableNonTLS = true;

            return await handleSubscriptionRequest(
                request, uuid, domain, piu, ipv4, ipv6, 
                ispMobile, ispUnicom, ispTelecom, 
                evEnabled, etEnabled, vmEnabled, hy2Enabled,
                disableNonTLS, url.searchParams.get('path') || '/', echConfig
            );
        }

        return new Response('404 Not Found', { status: 404 });
    }
};

// --- 补全的 UI 界面函数 ---

function generateHomePage(hostname) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CF 优选订阅生成器</title>
    <style>
        :root { --ios-blue: #007AFF; --ios-bg: #F2F2F7; }
        body { font-family: -apple-system, sans-serif; background: var(--ios-bg); margin: 0; padding: 20px; color: #000; }
        .card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 500px; margin: auto; }
        h2 { text-align: center; font-weight: 600; margin-top: 0; }
        .group { margin-bottom: 15px; }
        label { display: block; font-size: 14px; color: #8E8E93; margin-bottom: 5px; }
        input, select { width: 100%; padding: 12px; border: 1px solid #C6C6C8; border-radius: 8px; box-sizing: border-box; font-size: 16px; }
        .checkbox-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #F2F2F7; padding: 10px; border-radius: 8px; }
        .checkbox-group div { display: flex; align-items: center; font-size: 14px; }
        input[type="checkbox"] { width: auto; margin-right: 8px; }
        button { width: 100%; background: var(--ios-blue); color: #fff; border: none; padding: 15px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px; }
        button:active { opacity: 0.8; }
        #result { margin-top: 20px; word-break: break-all; font-size: 12px; background: #eee; padding: 10px; border-radius: 8px; display: none; }
    </style>
</head>
<body>
    <div class="card">
        <h2>订阅生成器</h2>
        <div class="group">
            <label>UUID</label>
            <input type="text" id="uuid" placeholder="请输入你的 UUID" value="88888888-4444-4444-4444-121212121212">
        </div>
        <div class="group">
            <label>中转域名 (SNI)</label>
            <input type="text" id="domain" value="${hostname}">
        </div>
        <div class="group">
            <label>协议选择</label>
            <div class="checkbox-group">
                <div><input type="checkbox" id="vl" checked> VLESS</div>
                <div><input type="checkbox" id="tr"> Trojan</div>
                <div><input type="checkbox" id="mess"> VMess</div>
                <div><input type="checkbox" id="hy2"> Hysteria2</div>
            </div>
        </div>
        <div class="group">
            <label>输出格式</label>
            <select id="target">
                <option value="base64">通用 Base64</option>
                <option value="clash">Clash 配置</option>
                <option value="surge">Surge 配置</option>
            </select>
        </div>
        <button onclick="generate()">生成订阅链接</button>
        <div id="result"></div>
    </div>

    <script>
        function generate() {
            const uuid = document.getElementById('uuid').value;
            const domain = document.getElementById('domain').value;
            const target = document.getElementById('target').value;
            
            let url = window.location.origin + '/' + uuid + '/sub?domain=' + domain;
            if (!document.getElementById('vl').checked) url += '&vl=no';
            if (document.getElementById('tr').checked) url += '&tr=yes';
            if (document.getElementById('mess').checked) url += '&mess=yes';
            if (document.getElementById('hy2').checked) url += '&hy2=yes';
            if (target !== 'base64') url += '&target=' + target;

            const resDiv = document.getElementById('result');
            resDiv.style.display = 'block';
            resDiv.innerText = url;
            alert('链接已生成，请从下方灰色区域复制');
        }
    </script>
</body>
</html>`;
}

// --- 节点生成逻辑补全 ---

async function handleSubscriptionRequest(request, user, domain, piu, ipv4, ipv6, ispM, ispU, ispT, ev, et, vm, hy2, dkby, path, ech) {
    const finalLinks = [];
    
    // 获取优选IP
    const dynamicIPs = await fetchDynamicIPs(ipv4, ipv6, ispM, ispU, ispT);
    
    // 生成 VLESS
    if (ev) {
        finalLinks.push(...generateLinksFromSource(dynamicIPs, user, domain, dkby, path, ech));
    }
    // 生成 Trojan
    if (et) {
        finalLinks.push(...await generateTrojanLinksFromSource(dynamicIPs, user, domain, dkby, path, ech));
    }
    // 生成 VMess
    if (vm) {
        finalLinks.push(...generateVMessLinksFromSource(dynamicIPs, user, domain, dkby, path, ech));
    }
    // 生成 Hysteria2 (新增)
    if (hy2) {
        dynamicIPs.forEach(item => {
            const nodeName = \`\${item.isp || 'CF'}-\${item.colo || 'Any'}-Hy2\`;
            const safeIP = item.ip.includes(':') ? \`[\${item.ip}]\` : item.ip;
            finalLinks.push(\`hysteria2://\${user}@\${safeIP}:443?sni=\${domain}&obfs=none#\${encodeURIComponent(nodeName)}\`);
        });
    }

    if (finalLinks.length === 0) finalLinks.push("vless://error@127.0.0.1:443?security=tls#无可用节点");

    const responseText = btoa(finalLinks.join('\\n'));
    return new Response(responseText, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

// UUID 简单验证
function isValidUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ... 其余已有的 fetchDynamicIPs, generateLinksFromSource 等函数保持不变 ...
