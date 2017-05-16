var bg = chrome.extension.getBackgroundPage();
var host = "http://127.0.0.1:8080/TimeServer";

// 指定图表的配置项和数据
var option = null;
// 图表实例
var myChart = null;

// 在页面画出饼图，flag有两种值，today或者all，today就取当日的数据，all就取总共的数据。默认是当日的数据
// 我发现页面刚一打开时，第一个参数打印出来会是一个Event对象，应该是页面load的事件，所以这里将flag放入第二个参数
function draw(event, flag = "today") {
    if (myChart == null) {
        var todayBtn = $("#today");
        var allBtn = $("#all");

        todayBtn.on("click", eventFunction);
        allBtn.on("click", eventFunction);
    }

    initOption();
    updateTime();

    // 还没有记录过
    if (localStorage["domains"] == null) {
        return;
    }

    // 根据显示个数调整显示样式
    var showCounts = localStorage["show"];
    if (showCounts == 15) {
        var mainDiv = $("#main");
        mainDiv.css("height","400px");
        option.legend.height = 400;
    } else if (showCounts == 20) {
        var mainDiv = $("#main");
        mainDiv.css("height","500px");
        option.legend.height = 500;
    }

    // 基于准备好的dom，初始化echarts实例
    myChart = echarts.init($('#main')[0], 'macarons');
    // 使用刚指定的配置项和数据显示图表。

    var allDomainsStrArr = localStorage["domains"].split(",");
    var allDomainsObjArr = [];

    // 将所有domain的数据放入对象，这些对象放入allDomainsObjArr中
    allDomainsStrArr.forEach(function(item, index, array) {
        var obj = {
            domain: item
        }

        if (flag == "today") {
            obj.value = JSON.parse(localStorage[item]).today;
        } else {
            obj.value = JSON.parse(localStorage[item]).all;
        }

        if (obj.value != 0) {
            allDomainsObjArr.push(obj);
        }
    });

    allDomainsObjArr.sort(compare);
    allDomainsObjArr = allDomainsObjArr.slice(0, showCounts);

    allDomainsObjArr.forEach(function(item, index, array) {
        option.legend.data.push(item.domain);
        option.series[0].data.push({ value: item.value, name: item.domain });
    });

    myChart.setOption(option);
}

// 右上角“今日”、“总计”的点击事件处理函数
function eventFunction() {
    var id = this.id;

    if ($(this).attr("class") != null) {
        return;
    }

    initOption();
    myChart.dispose();

    if (id == "today") {
        draw(null, "today");
        $("#all").removeAttr("class");
        $(this).attr("class", "cur");
    } else {
        draw(null, "all");
        $("#today").removeAttr("class");
        $(this).attr("class", "cur");
    }
}

// 初始化option参数
function initOption() {
    option = {
        title: {
            show: false,
            x: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params, ticket, callback) {
                var tip = params.name + "<br/>" + secondsToTimeStr(params.value) + "(" + params.percent + "%)";
                return tip;
            }
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            top: 'middle',
            // 数组内容由series.data中的所有对象的name组成
            data: []
        },
        series: [{
            name: '时间',
            type: 'pie',
            radius: [0, 110],
            label: {
                normal: {
                    show: false
                }
            },
            center: [350, '50%'],
            // 数组内容是一个个对象，对象内属性有value和name
            data: [],
            itemStyle: {
                emphasis: {
                    shadowBlur: 10,
                    shadowOffsetX: 5,
                    shadowOffsetY: 5,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };
}

function compare(obj1, obj2) {
    if (obj1.value < obj2.value) {
        return 1;
    } else if (obj1.value > obj2.value) {
        return -1;
    }

    return 0;
}

// 统计所有窗口的计时并存储起来
function updateTime() {
    // 这个数组存储已经计算过存储时间的domain，第二次再碰到就不计算了
    var saved = [];

    //点击插件时，全部激活tab的访问时间都更新
    for (var i = 0; i < bg.windowsArr.length; i++) {
        var windowId = bg.windowsArr[i];

        if (localStorage[windowId] == null) {
            continue;
        }

        var domain = JSON.parse(localStorage[windowId]).domain;
        var notSave = saved.every(function(item, index, array) {
            // 还没存储过访问时间
            if (domain != item) {
                return true;
            }
            return false;
        });

        if (notSave) {
            bg.saveTime(windowId);
            saved.push(domain);
        }
    }
}

// 秒数转时间字符串
function secondsToTimeStr(seconds) {
    var hours = 0;
    var minutes = 0;

    if (seconds >= 3600) {
        hours = parseInt(seconds / 3600);
        seconds -= 3600 * hours;
    }

    if (seconds >= 60) {
        minutes = parseInt(seconds / 60);
        seconds -= 60 * minutes;
    }

    var timeStr = "";
    if (hours != 0) {
        timeStr += hours + "时" + minutes + "分";
    } else if (minutes != 0) {
        timeStr += minutes + "分";
    }

    return timeStr + seconds + "秒";
}

// 创建一些事件处理
//1.注册、登录页面切换事件
function initEvent() {
    // 登录注册页面的submit按钮的事件处理
    $("#signin-form").on("submit", submitEventHandler);
    $("#signup-form").on("submit", submitEventHandler);

    //注册、登录页面切换事件
    $("#signin-index").on("click", function() {
        $("#signup-index").removeAttr("class");
        $("#signin-index").attr("class", "cur");
        $("#underline").css("left",0);
        $("#signin").css("display","block");
        $("#signup").css("display","none");
    });
    $("#signup-index").on("click", function() {
        $("#signin-index").removeAttr("class");
        $("#signup-index").attr("class", "cur");
        $("#underline").css("left","4em");
        $("#signup").css("display","block");
        $("#signin").css("display","none");
    });
}

// 提交按钮点击后的事件处理器
function submitEventHandler(event) {
    var form = event.target;
    event.preventDefault();

    var url;
    var data;
    if (form.id == "signin-form") {
        url = host + "/login";
        data = {
            phone: form.elements["phone"].value,
            password: hex_md5(form.elements["password"].value).substr(5,24)
        };
    } else {
        url = host + "/regist";
        data = {
            phone: form.elements["phone"].value,
            password: hex_md5(form.elements["password"].value).substr(5,24),
            password2: hex_md5(form.elements["password2"].value).substr(5,24),
            nickname: form.elements["nickname"].value
        };
    }

    $.post(url, data, function(result) {
        result = JSON.parse(result);
        if (result.code == 0) {
            if (form.id == "signin-form") {
                localStorage["uuid"] = result.uuid;
                localStorage["logined"] = "on";
                location.reload();
            } else {

            }
        }
    });
}

// 页面加载后第一个执行
function start() {
    var uuid = localStorage["uuid"];
    // 表示未登录
    var logined = false;

    // 有uuid值，验证是否是真的登陆了
    if (uuid != null) {
        var data = {
            uuid: uuid
        };
        $.post( host + "/verify", data, function(result) {
            result = JSON.parse(result);
            if (result.code == 0) {
                logined = true;
            }

            // 根据登录与否判断显示哪一个div
            if (logined) {
                $("#logined").show();
                $("#nologined").hide();
                draw();
            }
        });
    }
    initEvent();
}

window.addEventListener("load", start, false);