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
for i in photo_list:
    if i.endswith('jpg'):
        html = '                    <li><a href="img/people/' + i + '" class="fresco" data-fresco-caption="My Caption" data-fresco-group="people"><img src="img/people/thumb/' + i + '" alt="merp"></a></li>\n'
        file.write(html)
    else:
        pass
file.close()
    
