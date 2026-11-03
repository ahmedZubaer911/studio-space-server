import express from 'express';

const app = express();
const port = 8000;  //http://localhost:8000

app.get('/', (req, res) => {
  res.send({message:`Server is running fine!`})
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})