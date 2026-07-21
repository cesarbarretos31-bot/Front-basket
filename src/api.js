import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://basket-api-re4v.onrender.com',
  headers: {
    'Content-Type': 'application/json'
  }
});