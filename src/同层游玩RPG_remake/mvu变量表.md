{
  "$meta": {
    "extensible": false
  },
  "date": [
    "2025-01-01",
    "当前日期，格式为YYYY-MM-DD。根据故事进展，当'时间'跨越午夜时更新"
  ],
  "time": [
    "06:00",
    "当前的确切时间,24小时制,格式为hh:mm。随着故事中行动的消耗而推进"
  ],
  "location": [
    "未知",
    "<user>当前所在的具体地点"
  ],
  "gender": [
    "未知",
    "<user>的性别,在角色创建后确定，禁止更改"
  ],
  "race": [
    "未知",
    "<user>的种族,在角色创建后确定，禁止更改"
  ],
  "age": [
    16,
    "<user>的年龄,会随着游戏中的事件增长"
  ],
  "random_event": [
    "无",
    "用来存储随机事件的名称。当特定条件触发时，此处会更新为当前发生的随机事件的名称，事件结束后应重置为'无'"
  ],
  "base_attributes": [
    {
      "力量": 10,
      "敏捷": 10,
      "智力": 10,
      "体质": 10,
      "魅力": 10,
      "幸运": 10,
      "意志": 10
    },
    "角色的七大基础属性。只在升级或获得永久性状态改变时更新"
  ],
  "current_attributes": [
    {
      "力量": 10,
      "敏捷": 10,
      "智力": 10,
      "体质": 10,
      "魅力": 10,
      "幸运": 10,
      "意志": 10
    },
    "角色的七大当前属性，由基础属性、装备加成、临时状态效果叠加计算得出，在角色状态变化时更新"
  ],
  "equipment": [
    {
      "$meta": {
        "extensible": false
      },
      "weapon": null,
      "armor": null,
      "accessory": null
    },
    "当前穿戴的装备。装备或卸下物品时更新，并触发对'当前属性'的重新计算"
  ],
  "inventory": [
    {
      "$meta": {
        "extensible": false
      },
      "weapons": [
        [
          "$__META_EXTENSIBLE__$"
        ],
        "存放所有武器。结构: {'name':'物品名', 'description':'描述', 'attributes_bonus':{...}}"
      ],
      "armors": [
        [
          "$__META_EXTENSIBLE__$"
        ],
        "存放所有防具。结构: {'name':'物品名', 'description':'描述', 'attributes_bonus':{...}}"
      ],
      "accessories": [
        [
          "$__META_EXTENSIBLE__$"
        ],
        "存放所有饰品。结构: {'name':'物品名', 'description':'描述', 'attributes_bonus':{...}}"
      ],
      "others": [
        [
          "$__META_EXTENSIBLE__$"
        ],
        "存放任务物品、消耗品、材料等其他杂物。结构: {'name':'物品名', 'description':'描述', 'quantity':1}"
      ]
    },
    "<user>的背包，存放<user>当前持有的所有物品"
  ],
  "relationships": [
    {
      "$meta": {
        "extensible": true,
        "template": {
          "id": 100,
          "gender": "未知",
          "race": "未知",
          "age": 未知,
          "background": "未知",
          "personality": "未知",
          "outfit": "未知",
          "thoughts": "未知",
          "relationship": "陌生人",
          "others": "未知",
          "events": [
            [
              "$__META_EXTENSIBLE__$"
            ],
            "记录与该角色关键事件的数组，关键事件只有角色与<user>立下重大约定，角色发生重大改变，角色与<user>发生改变时才能增加记录"
          ],
          "attributes": {
            "strength": 10,
            "agility": 10,
            "intelligence": 10,
            "constitution": 10,
            "charisma": 10,
            "willpower": 10,
            "luck": 10
          },
          "affinity": [
            0,
            "对<user>的好感度,范围[-200,200]"
          ]
        }
      }
    },
    "存放<user>的所有人物关系。新角色的ID应从100开始递增"
  ]
}
