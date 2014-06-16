'''
Created on June 15, 2014

@author: Andrew
'''
import os
import re
import glob
import textwrap
digits = re.compile(r'(\d+)')
def tokenize(filename):
    return tuple(int(token) if match else token
                 for token, match in
                 ((fragment, digits.search(fragment))
                  for fragment in digits.split(filename)))
photoTargets = ['action', 'music', 'landscape', 'people']
for i in photoTargets:
    photo_folder = os.path.abspath('images/' + i + '/')
    glob_photo_list = glob.glob(photo_folder + '/*.jpg')
    photoList = []
    for k in glob_photo_list:
        photoList.append(os.path.basename(k))
    photoList.sort(key=tokenize)
    print (os.path.join('scripts/json', i + '.txt'))
    file = open(os.path.join('scripts/json', i + '.json'), 'w')
    file.write('''{
    "category" : "''' + i + '''",

    "images" :
    [''')
    folderLength = len(photoList)
    for i in photoList:
        obj1 = '<a href="img/people/' + i + '" class="fresco" data-fresco-caption="My Caption" data-fresco-group="people"><img src="img/people/thumb/' + i + '" alt="merp"></a></li>\n'
        obj = '''
        {
            "title" : "title",
            "imagePath" : "''' + i + '''",
            "caption" : "caption"
        },'''
        if photoList.index(i) == folderLength - 1:
            obj = obj.replace('},','}')
        file.write(obj)
    file.write(textwrap.dedent('''
    ]
}'''))
    file.close()
