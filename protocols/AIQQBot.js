const request = require('request');
const _ = require('lodash');
const uuid = require('uuid/v4');
const crypto = require('crypto');
const fs = require('fs');

const rules = JSON.parse(fs.readFileSync('./matching_rules/rules.json', 'utf8'));
const ruleKeys = Object.keys(rules);

module.exports = function (recvObj, client) {
    inputText = recvObj.params.content.replace(/\[.*?\]/g, '').trim();
    if (_.isEmpty(inputText)) {
        client.sendObj({
            id: uuid(),
            method: "sendMessage",
            params: {
                type: recvObj.params.type,
                group: recvObj.params.group || '',
                qq: recvObj.params.qq || '',
                content: (Math.random() > 0.5) ? '[QQ:pic=https://sub1.gameoldboy.com/satania_cry.gif]' : '欧尼酱~想我了吗？'
            }
        });
        return;
    }

    // 拦截规则
    for (let i = ruleKeys.length - 1; i >= 0; i--) {
        if (new RegExp(ruleKeys[i], 'im').test(inputText)) {
            const index = parseInt(Math.random() * rules[ruleKeys[i]].length);
            client.sendObj({
                id: uuid(),
                method: "sendMessage",
                params: {
                    type: recvObj.params.type,
                    group: recvObj.params.group || '',
                    qq: recvObj.params.qq || '',
                    content: rules[ruleKeys[i]][index]
                }
            });
            return;
        }
    }

    AIQQBot(inputText, recvObj, client);
}

async function AIQQBot(inputText, recvObj, client) {
    const params = {
        app_id: secret.AI_QQ_APPID,
        time_stamp: parseInt(Date.now() / 1000),
        nonce_str: uuid().replace(/-/g, ''),
        sign: '',
        session: recvObj.params.qq,
        question: inputText
    }

    const paramKeys = Object.keys(params);
    paramKeys.sort();

    let str = '';
    for (const key of paramKeys) {
        if (key != 'sign') {
            str += (str != '' ? '&' : '') + `${key}=${key=='question'?encodeURI(params[key]):params[key]}`
        }
    }
    str += `&app_key=${secret.AI_QQ_APPKEY}`;
    params.sign = crypto.createHash('md5').update(str).digest('hex').toUpperCase();

    let botObj;
    try {
        botObj = await new Promise((resolve, reject) => {
            request.post({
                url: 'https://api.ai.qq.com/fcgi-bin/nlp/nlp_textchat',
                form: params
            }, (err, res, body) => {
                if (err) {
                    reject();
                    return;
                }
                let result;
                try {
                    result = JSON.parse(body);
                } catch {
                    reject();
                    return;
                }
                if (result.ret == 0) {
                    console.log('AI Bot:', result.data.answer);
                    resolve(result);
                } else {
                    resolve(null);
                }
            });
        });
    } catch {
        client.sendObj({
            id: uuid(),
            method: "sendMessage",
            params: {
                type: recvObj.params.type,
                group: recvObj.params.group || '',
                qq: recvObj.params.qq || '',
                content: '电波出了点问题~喵'
            }
        });
        return;
    }

    if (!botObj) {
        client.sendObj({
            id: uuid(),
            method: "sendMessage",
            params: {
                type: recvObj.params.type,
                group: recvObj.params.group || '',
                qq: recvObj.params.qq || '',
                content: `[QQ:pic=https://sub1.gameoldboy.com/satania_cry.gif]`
            }
        });
        return;
    }

    client.sendObj({
        id: uuid(),
        method: "sendMessage",
        params: {
            type: recvObj.params.type,
            group: recvObj.params.group || '',
            qq: recvObj.params.qq || '',
            content: botObj.data.answer
        }
    });
}