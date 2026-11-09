package app.athan.daily;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class QuranAssetTest {
 @Test public void packagedQuranContainsEverySurahAndVerse() throws Exception {
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
  try(java.io.InputStream input=context.getAssets().open("public/quran.json")) {
   java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();
   byte[] buffer=new byte[8192];int length;
   while((length=input.read(buffer))!=-1) bytes.write(buffer,0,length);
   JSONArray surahs=new JSONArray(bytes.toString("UTF-8"));
   assertEquals(114,surahs.length());int verses=0;
   for(int i=0;i<surahs.length();i++) verses+=surahs.getJSONObject(i).getJSONArray("verses").length();
   assertEquals(6236,verses);
  }
 }
}
