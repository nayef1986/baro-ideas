import { useState } from "react";
import { S, fm, fpm } from "./constants.js";

export function OfferBuilder({ products = [], periods = [], images = {}, settings = {} }) {
  return (
    <div style={{padding:"20px",color:"#fff"}}>
      <div style={{fontSize:"18px",fontWeight:"900"}}>منشئ العروض</div>
      <div style={{marginTop:"10px",color:"#d4a853"}}>عدد المنتجات: {products.length}</div>
    </div>
  );
}
