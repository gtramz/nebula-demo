"""Incremental, idempotent mapping of existing curated offers to their recordings.
Never recreates accounts, posts, messages or the scenario. Backup before running.
"""
import sqlite3,json
from pathlib import Path
root=Path(__file__).resolve().parent.parent/'.data/presentation'
for name in ['nebula.sqlite','initial.sqlite']:
 c=sqlite3.connect(root/name)
 for offer_id,post_id in [(1,1),(2,2),(3,3),(4,4),(5,5),(6,6),(7,9),(8,10),(9,4),(10,1)]:
  row=c.execute('SELECT data,project,owner FROM collaboration_offers WHERE id=?',(offer_id,)).fetchone()
  post=c.execute('SELECT data,owner FROM posts WHERE id=?',(post_id,)).fetchone()
  if not row or not post:continue
  data=json.loads(row[0]);source=json.loads(post[0])
  if data.get('referenceMediaId') or row[1]!=source.get('projectId') or row[2]!=post[1]:continue
  data['referenceMediaId']=source['mediaId']
  c.execute('UPDATE collaboration_offers SET data=? WHERE id=?',(json.dumps(data,ensure_ascii=False),offer_id))
 c.commit();c.close();print(name,': references attached; existing scenario preserved')
