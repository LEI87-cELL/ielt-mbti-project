import re

file_path = r'C:\Users\雷雨田\WorkBuddy\20260507134916\ielt-mbti-project\frontend\index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 在 "const pi = personaInfo[topP];" 后面插入动态文案代码
insert_after = '            const pi = personaInfo[topP];\n            return `'
insert_code = '''            const pi = personaInfo[topP];

            // 根据所选学校动态生成恭喜文案、推荐国家和结尾备注
            let congratsText = '';
            let recommendCountry = '';
            let recommendReason = '';
            let schoolGiftText = '';

            if (selectedSchool && selectedSchool.country) {
                if (selectedSchool.country === '香港') {
                    congratsText = '🎉 恭喜你成为「中国香港」准留学生！ 🎉';
                } else if (selectedSchool.country === '澳门') {
                    congratsText = '🎉 恭喜你成为「中国澳门」准留学生！ 🎉';
                } else {
                    congratsText = '🎉 恭喜你成为「' + selectedSchool.country + '」准留学生！ 🎉';
                }
                const extraCountry = selectedSchool.country === '英国' ? '澳洲' : selectedSchool.country === '澳洲' ? '英国' : '英国';
                recommendCountry = selectedSchool.country + ' · ' + selectedSchool.name;
                recommendReason = '根据你的心仪学校「' + selectedSchool.name + '」推荐，' + selectedSchool.country + '是你的首选目的地！同时' + extraCountry + '也是不错的备选方案，两地教育资源共享，申请策略可联动规划。';
                schoolGiftText = '<div style="text-align:center;font-size:12px;color:#8B7355;margin:8px 0 0;line-height:1.6;">💼 加微信进群领取「<strong>' + selectedSchool.name + '</strong>」专属大礼包</div>';
            } else {
                congratsText = '🎉 恭喜你成为「' + data.country.split('·')[0].trim() + '」准留学生！ 🎉';
                recommendCountry = data.country || '';
                recommendReason = data.countryReason || '';
                schoolGiftText = '';
            }

            return `'''

if insert_after in content:
    content = content.replace(insert_after, insert_code, 1)
    print('✅ 插入动态文案代码成功')
else:
    print('❌ 未找到插入位置')

# 2. 替换恭喜文案
old_congrats = '🎉 恭喜你成为「${data.country.split(\\'·\\')[0].trim()}」准留学生！ 🎉'
new_congrats = '${congratsText}'
if old_congrats in content:
    content = content.replace(old_congrats, new_congrats, 1)
    print('✅ 替换恭喜文案成功')

# 3. 替换推荐国家
old_country = '<div class="dest-top"><span class="dest-label">🗺️ 推荐留学国家</span><span class="dest-value">${data.country}</span></div><div class="dest-reason">💡 ${data.countryReason}</div>'
new_country = '<div class="dest-top"><span class="dest-label">🗺️ 推荐留学国家</span><span class="dest-value">${recommendCountry}</span></div><div class="dest-reason">💡 ${recommendReason}</div>'
if old_country in content:
    content = content.replace(old_country, new_country, 1)
    print('✅ 替换推荐国家成功')

# 4. 替换结尾页备注
old_gift = '<div class="wechat-row"><span>📘</span> 高顿紫藤学姐微信：<strong>pppppeky</strong><button class="copy-btn" id="copyWechatBtn">复制</button></div></div>'
new_gift = '<div class="wechat-row"><span>📘</span> 高顿紫藤学姐微信：<strong>pppppeky</strong><button class="copy-btn" id="copyWechatBtn">复制</button></div>${schoolGiftText}</div>'
if old_gift in content:
    content = content.replace(old_gift, new_gift, 1)
    print('✅ 替换结尾页备注成功')

# 写回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\n🎉 所有修改完成！请刷新浏览器测试')
