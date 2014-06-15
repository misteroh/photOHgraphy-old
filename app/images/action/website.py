'''
Created on Mar 24, 2011

@author: Andrew
'''
import os
import re
digits = re.compile(r'(\d+)')
def tokenize(filename):
    return tuple(int(token) if match else token
                 for token, match in
                 ((fragment, digits.search(fragment))
                  for fragment in digits.split(filename)))
photo_folder = os.path.abspath('.')
photo_list = os.listdir(photo_folder)
photo_list.sort(key=tokenize)
file = open('output.txt', 'w')
currentDir = os.getcwd()
cwd = currentDir.split('\\')[-1]
for i in photo_list:
    if i.endswith('jpg'):
        html = '                    <li><a href="img/' + cwd + '/' + i + '" class="fresco" data-fresco-caption="My Caption" data-fresco-group="' + cwd + '"><img src="img/' + cwd + '/thumb/' + i + '" alt="merp"></a></li>\n'
        file.write(html)
    else:
        pass
file.close()
    
