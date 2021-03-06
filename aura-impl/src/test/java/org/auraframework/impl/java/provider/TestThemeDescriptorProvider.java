/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.auraframework.impl.java.provider;

import org.auraframework.Aura;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.ThemeDef;
import org.auraframework.def.ThemeDescriptorProvider;
import org.auraframework.system.Annotations.Provider;
import org.auraframework.throwable.quickfix.QuickFixException;

@Provider
public class TestThemeDescriptorProvider implements ThemeDescriptorProvider {
    public static final String DESC = "test:fakeTheme";
    public static final String REF = "java://org.auraframework.impl.java.provider.TestThemeDescriptorProvider";

    @Override
    public DefDescriptor<ThemeDef> provide() throws QuickFixException {
        return Aura.getDefinitionService().getDefDescriptor(DESC, ThemeDef.class);
    }

}
