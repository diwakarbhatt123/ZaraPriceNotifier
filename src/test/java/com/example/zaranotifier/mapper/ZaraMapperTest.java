package com.example.zaranotifier.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.example.zaranotifier.domain.dto.ProductDetailsItem;
import com.example.zaranotifier.service.ZaraMapper;

class ZaraMapperTest {
    @Test
    void mapSkuMappingSelectsMatchingColor() {
        ProductDetailsItem.Size sizeM = new ProductDetailsItem.Size();
        sizeM.setName("M");
        sizeM.setSku(111L);

        ProductDetailsItem.Size sizeL = new ProductDetailsItem.Size();
        sizeL.setName("L");
        sizeL.setSku(222L);

        ProductDetailsItem.Color color1 = new ProductDetailsItem.Color();
        color1.setProductId(999L);
        color1.setSizes(List.of(sizeM));

        ProductDetailsItem.Color color2 = new ProductDetailsItem.Color();
        color2.setProductId(123L);
        color2.setSizes(Arrays.asList(sizeM, sizeL));

        ProductDetailsItem.Detail detail = new ProductDetailsItem.Detail();
        detail.setColors(Arrays.asList(color1, color2));

        ProductDetailsItem item = new ProductDetailsItem();
        item.setDetail(detail);

        ZaraMapper mapper = new ZaraMapper();
        ZaraMapper.SkuMapping mapping = mapper.mapSkuMapping(List.of(item), 123L);

        Map<String, Long> sizeToSku = mapping.getSizeToSku();
        assertEquals(2, sizeToSku.size());
        assertEquals(111L, sizeToSku.get("M"));
        assertEquals(222L, sizeToSku.get("L"));
        assertEquals(123L, mapping.getColorProductId());
    }

    @Test
    void mapSkuMappingFallsBackToFirstColor() {
        ProductDetailsItem.Size sizeS = new ProductDetailsItem.Size();
        sizeS.setName("S");
        sizeS.setSku(333L);

        ProductDetailsItem.Color color1 = new ProductDetailsItem.Color();
        color1.setProductId(888L);
        color1.setSizes(List.of(sizeS));

        ProductDetailsItem.Detail detail = new ProductDetailsItem.Detail();
        detail.setColors(List.of(color1));

        ProductDetailsItem item = new ProductDetailsItem();
        item.setDetail(detail);

        ZaraMapper mapper = new ZaraMapper();
        ZaraMapper.SkuMapping mapping = mapper.mapSkuMapping(List.of(item), 999L);

        assertEquals(1, mapping.getSizeToSku().size());
        assertEquals(333L, mapping.getSizeToSku().get("S"));
        assertEquals(888L, mapping.getColorProductId());
    }

    @Test
    void mapSkuMappingHandlesEmpty() {
        ZaraMapper mapper = new ZaraMapper();
        ZaraMapper.SkuMapping mapping = mapper.mapSkuMapping(List.of(), 1L);
        assertTrue(mapping.getSizeToSku().isEmpty());
    }
}
