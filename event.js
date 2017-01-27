chrome.tabs.onActivated.addListener(function callback(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function callback(tab) {
        var url = tab.url;
        var tabId = activeInfo.tabId;
        var windowId = activeInfo.windowId;
        var domain = extractDomain(url);

        // 激活了一个新的tab，就要把上一个tab的网站计时并保存
        if (localStorage[windowId] != null) {
            saveTime(windowId);
        }

        if (url.substring(0, 9) === "chrome://" || url.substring(0, 19) === "chrome-extension://") {
            localStorage.removeItem(windowId);
            return;
        }

        // 记录新的计时状态
        startTheTimer(windowId, tabId, url);
    });
});

// window关闭时，结束并保存那个window的网站计时
chrome.windows.onRemoved.addListener(function callback(windowId) {
    saveTime(windowId);
    localStorage.removeItem(windowId);
});

// 当tab更新时提醒，检测是否url改变了，改变了就存储上一个网站的计时
chrome.tabs.onUpdated.addListener(function callback(tabId, changeInfo, tab) {
	// 这个tab并不是最前端，就不作处理
	if (!tab.active) {
		return;
	}

    // url改变了
    if (changeInfo.url != null) {
        if (changeInfo.url.substring(0, 9) === "chrome://" || changeInfo.url.substring(0, 19) === "chrome-extension://") {
            return;
        }

        saveTime(tab.windowId);
        startTheTimer(tab.windowId, tabId, changeInfo.url);
    }
});

// 开始计时
function startTheTimer(windowId, tabId, url) {
    localStorage[windowId] = getStartTimeInfoJsonStr(tabId, extractDomain(url));
}

// 存储网站的访问时间
function saveTime(windowId) {
    // 已经有这个window的上一个被激活窗口的信息
    if (localStorage[windowId] != null) {
        var jsonObj = JSON.parse(localStorage[windowId]);
        var jsonStr = getSaveJsonStr(jsonObj.domain, jsonObj.start);

        if (jsonStr != null) {
            localStorage[jsonObj.domain] = jsonStr;
        }
    }
}

// 构造记录网站访问时间的json串，json串中的内容有：
// all 总共的访问时间
// today 当日访问时间
// 时间单位是秒
function getSaveJsonStr(domain, start) {
    var jsonStr = localStorage[domain];
    var today, all;

    // 本次的访问时间
    var time = parseInt((Date.now() - start) / 1000);

    if (time <= 0) {
        return null;
    }

    // 先前并没有给这个网站记过访问时间
    if (jsonStr == null) {
        all = today = time;
    } else {
        var jsonObj = JSON.parse(jsonStr);
        today = jsonObj.today + time;
        all = jsonObj.all + time;
    }

    return '{"today":' + today + ',"all":' + all + '}';
}

// 构造计时信息的json串，json串中的内容有：
// tabId 某个在window最前端的tab的Id
// domain 这个tab的网站域名
// start 开始计时的时间戳，13位
function getStartTimeInfoJsonStr(tabId, domain) {
    return '{"tabId":' + tabId + ',"domain":"' + domain + '","start":' + Date.now() + '}';
}

// 返回根据url求出的域名
function extractDomain(url) {
    var re = /:\/\/(www\.)?(.+?)\//;
    return url.match(re)[2];
}