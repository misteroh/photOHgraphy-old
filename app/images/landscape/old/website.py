'''
Created on Mar 24, 2011

@author: Andrew
'''
import os
photo_folder = os.path.abspath('.')
photo_list = os.listdir(photo_folder)
file = open('output.txt', 'w')
for i in photo_list:
    if i.endswith('jpg'):
        html = '            <td class="photo"><img src="photos/land/' + i + '" alt="" /></td>\n'
        file.write(html)
    else:
        pass
file.close()
    
